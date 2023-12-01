const Logger = require('../lib/utils/logger');
const config = require('../config');
const fs = require('fs');
const FormData = require('form-data');
const redis = require('redis');
const axios = require('axios').default;
const path = require('path');
const {NewPresFileAvailableMsg} = require('../lib/utils/message-builder');
const cp = require('child_process');
const {workerData} = require('worker_threads');
const [jobType, jobId, filename] = [workerData.jobType, workerData.jobId, workerData.filename];
const sanitize = require('sanitize-filename');
const logger = new Logger('presAnn Notifier Worker');

const dropbox = `${config.shared.presAnnDropboxDir}/${jobId}`;
const job = fs.readFileSync(path.join(dropbox, 'job'));
const exportJob = JSON.parse(job);

/** Notify Meeting Actor of file availability by
 * sending a message through Redis PubSub */
async function notifyMeetingActor() {
  const client = redis.createClient({
    host: config.redis.host,
    port: config.redis.port,
    password: config.redis.password,
  });

  await client.connect();
  client.on('error', (err) => logger.info('Redis Client Error', err));

  const link = path.join('presentation',
      exportJob.parentMeetingId, exportJob.parentMeetingId,
      exportJob.presId, 'pdf', jobId, filename);

  const notification = new NewPresFileAvailableMsg(exportJob, link);

  logger.info(`Annotated PDF available at ${link}`);
  await client.publish(config.redis.channels.publish, notification.build());
  client.disconnect();
}

/** Upload PDF to a BBB room
 * @param {String} filePath - Absolute path to the file, including the extension
*/
async function upload(filePath) {
  const callbackUrl = `${config.bbbWebAPI}/bigbluebutton/presentation/${exportJob.presentationUploadToken}/upload`;
  const formData = new FormData();
  formData.append('conference', exportJob.parentMeetingId);
  formData.append('pod_id', config.notifier.pod_id);
  formData.append('is_downloadable', config.notifier.is_downloadable);
  formData.append('temporaryPresentationId', jobId);
  formData.append('fileUpload', fs.createReadStream(filePath));
  formData.append('current', 'true');

  try {
    const res = await axios.post(callbackUrl, formData,
        {headers: formData.getHeaders()});
    logger.info(`Upload of job ${exportJob.jobId} returned ${res.data}`);
  } catch (error) {
    return logger.error(`Could not upload job ${exportJob.jobId}: ${error}`);
  }
}

async function renderMarkdownFile(filePath) {
  const mdFile = filePath.replace('.txt', '.pdf');
  const templatePath = './workers/templates/bbb_beamer_template.tex';
  const convertMarkdownFile = [
    '-t',
    'beamer',
    filePath,
    `--template=${templatePath}`,
    '-o',
    mdFile,
  ];

  try {
    cp.spawnSync('pandoc', convertMarkdownFile, {shell: false});
  } catch (error) {
    logger.error(`Processing slideshow failed for job ${jobId}: ${error.message}`);
    return;
  }

  upload(mdFile);
}

if (jobType == 'PresentationWithAnnotationDownloadJob') {
  notifyMeetingActor();
} else if (jobType == 'PresentationWithAnnotationExportJob') {
  const filePath = `${exportJob.presLocation}/pdfs/${jobId}/${filename}`;
  upload(filePath);
} else if (jobType == 'PadCaptureJob') {
  const filePath = `${dropbox}/${filename}`;
  upload(filePath);
} else if (jobType == 'PadCaptureMarkdownJob') {
  const filePath = `${dropbox}/${filename}`;

  renderMarkdownFile(filePath);
} else {
  logger.error(`Notifier received unknown job type ${jobType}`);
}

// Delete temporary files
fs.rm(dropbox, {recursive: true}, (err) => {
  if (err) {
    throw err;
  }
});
