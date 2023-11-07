import Logger from '../lib/utils/logger.js';
import axios from 'axios';
import fs from 'fs';
import path from 'path';
import redis from 'redis';
import sanitize from 'sanitize-filename';
import stream from 'stream';
import WorkerStarter from '../lib/utils/worker-starter.js';
import {PresAnnStatusMsg} from '../lib/utils/message-builder.js';
import {workerData} from 'worker_threads';
import {promisify} from 'util';

const jobId = workerData.jobId;
const logger = new Logger('presAnn Collector');
logger.info(`Collecting job ${jobId}`);

const config = JSON.parse(fs.readFileSync('./config/settings.json', 'utf8'));
const dropbox = path.join(config.shared.presAnnDropboxDir, jobId);

// Takes the Job from the dropbox
const job = fs.readFileSync(path.join(dropbox, 'job'));
const exportJob = JSON.parse(job);
const jobType = exportJob.jobType;

async function collectAnnotationsFromRedis() {
  const client = redis.createClient({
    host: config.redis.host,
    port: config.redis.port,
    password: config.redis.password,
  });

  client.on('error', (err) => logger.info('Redis Client Error', err));

  await client.connect();

  const presAnn = await client.hGetAll(jobId);

  // Remove annotations from Redis
  await client.del(jobId);

  const annotations = JSON.stringify(presAnn);

  const whiteboard = JSON.parse(annotations);
  const pages = JSON.parse(whiteboard.pages);

  fs.writeFile(path.join(dropbox, 'whiteboard'), annotations, function(err) {
    if (err) {
      return logger.error(err);
    }
  });

  // Collect the presentation page files (PDF / PNG / JPEG)
  // from the presentation directory
  const presFile = path.join(exportJob.presLocation, exportJob.presId);
  const pdfFile = `${presFile}.pdf`;

  // Message to display conversion progress toast
  const statusUpdate = new PresAnnStatusMsg(exportJob);

  if (fs.existsSync(pdfFile)) {
    // If there's a PDF file, we leverage the existing converted SVG slides
    for (const p of pages) {
      const pageNumber = p.page;
      const imageName = `slide${pageNumber}`;
      const convertedSVG = path.join(
          exportJob.presLocation,
          'svgs',
          `${imageName}.svg`);

      const outputFile = path.join(dropbox, `slide${pageNumber}.svg`);

      try {
        fs.copyFileSync(convertedSVG, outputFile);
      } catch (error) {
        logger.error('Failed collecting slide ' + pageNumber +
          ' in job ' + jobId + ': ' + error.message);
        statusUpdate.setError();
      }

      await client.publish(
          config.redis.channels.publish,
          statusUpdate.build(pageNumber));
    }
  } else {
    const imageName = 'slide1';

    if (fs.existsSync(`${presFile}.png`)) {
      fs.copyFileSync(`${presFile}.png`,
          path.join(dropbox, `${imageName}.png`));
    } else if (fs.existsSync(`${presFile}.jpeg`)) {
      fs.copyFileSync(`${presFile}.jpeg`,
          path.join(dropbox, `${imageName}.jpeg`));
    } else if (fs.existsSync(`${presFile}.jpg`)) {
      // JPG file available: copy changing extension to JPEG
      fs.copyFileSync(`${presFile}.jpg`,
          path.join(dropbox, `${imageName}.jpeg`));
    } else {
      await client.publish(config.redis.channels.publish, statusUpdate.build());
      client.disconnect();
      return logger.error(`PDF/PNG/JPG/JPEG file not found for job ${jobId}`);
    }

    await client.publish(config.redis.channels.publish, statusUpdate.build());
  }

  client.disconnect();

  const process = new WorkerStarter({jobId});
  process.process();
}

async function sleep(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

/** Export shared notes via bbb-pads in the desired format
 * @param {Integer} retries - Number of retries to get the shared notes
*/
async function collectSharedNotes(retries = 3) {
  /** One of the following formats is supported:
    etherpad / html / pdf / txt / doc / odf */

  const padId = exportJob.presId;
  const notesFormat = 'pdf';

  const sanitizedFilename = sanitize(exportJob.filename.replace(/\s/g, '_'));
  const filename = sanitizedFilename + '.' + notesFormat;
  const notesEndpoint = `${config.bbbPadsAPI}/p/${padId}/export/${notesFormat}`;
  const filePath = path.join(dropbox, filename);

  const finishedDownload = promisify(stream.finished);
  const writer = fs.createWriteStream(filePath);

  try {
    const response = await axios({
      method: 'GET',
      url: notesEndpoint,
      responseType: 'stream',
    });
    response.data.pipe(writer);
    await finishedDownload(writer);
  } catch (err) {
    if (retries > 0 && err?.response?.status == 429) {
      // Wait for the bbb-pads API to be available due to rate limiting
      const backoff = err.response.headers['retry-after'] * 1000;
      logger.info(`Retrying ${jobId} in ${backoff}ms...`);
      await sleep(backoff);
      return collectSharedNotes(retries - 1);
    } else {
      logger.error(`Could not download notes in job ${jobId}`);
      return;
    }
  }

  const notifier = new WorkerStarter({jobType, jobId, filename});
  notifier.notify();
}

switch (jobType) {
  case 'PresentationWithAnnotationExportJob':
    collectAnnotationsFromRedis();
    break;
  case 'PresentationWithAnnotationDownloadJob':
    collectAnnotationsFromRedis();
    break;
  case 'PadCaptureJob':
    collectSharedNotes();
    break;
  default:
    logger.error(`Unknown job type ${jobType}`);
}
