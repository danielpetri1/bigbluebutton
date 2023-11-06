import Logger from '../lib/utils/logger.js';
import fs from 'fs';
import {createSVGWindow} from 'svgdom';
import {SVG as svgCanvas, registerWindow} from '@svgdotjs/svg.js';
import cp from 'child_process';
import WorkerStarter from '../lib/utils/worker-starter.js';
import {workerData} from 'worker_threads';
import path from 'path';
import sanitize from 'sanitize-filename';
import probe from 'probe-image-size';
import redis from 'redis';
import {PresAnnStatusMsg} from '../lib/utils/message-builder.js';
import {sortByKey} from '../shapes/helpers.js';
import {Draw} from '../shapes/Draw.js';
import {Highlight} from '../shapes/Highlight.js';
import {Line} from '../shapes/Line.js';
import {Arrow} from '../shapes/Arrow.js';
import {TextShape} from '../shapes/TextShape.js';
import {StickyNote} from '../shapes/StickyNote.js';
import {createGeoObject} from '../shapes/geoFactory.js';

const jobId = workerData.jobId;
const logger = new Logger('presAnn Process Worker');
const config = JSON.parse(fs.readFileSync('./config/settings.json', 'utf8'));

logger.info('Processing PDF for job ' + jobId);

const dropbox = path.join(config.shared.presAnnDropboxDir, jobId);
const job = fs.readFileSync(path.join(dropbox, 'job'));
const exportJob = JSON.parse(job);
const statusUpdate = new PresAnnStatusMsg(exportJob,
    PresAnnStatusMsg.EXPORT_STATUSES.PROCESSING);

// Convert points to pixels
function toPx(pt) {
  return (pt / config.process.pointsPerInch) * config.process.pixelsPerInch;
}

function overlayDraw(svg, annotation) {
  const drawing = new Draw(annotation);
  const drawnDrawing = drawing.draw();

  svg.add(drawnDrawing);
}

function overlayGeo(svg, annotation) {
  const geo = createGeoObject(annotation);
  const geoDrawn = geo.draw();
  svg.add(geoDrawn);
}

function overlayHighlight(svg, annotation) {
  // Adjust JSON properties
  annotation.opacity = 0.3;

  const highlight = new Highlight(annotation);
  const highlightDrawn = highlight.draw();
  svg.add(highlightDrawn);
}

function overlayLine(svg, annotation) {
  const line = new Line(annotation);
  const lineDrawn = line.draw();
  svg.add(lineDrawn);
}

function overlayArrow(svg, annotation) {
  const arrow = new Arrow(annotation);
  const arrowDrawn = arrow.draw();
  svg.add(arrowDrawn);
}

function overlaySticky(svg, annotation) {
  const stickyNote = new StickyNote(annotation);
  const stickyNoteDrawn = stickyNote.draw();
  svg.add(stickyNoteDrawn);
}

function overlayText(svg, annotation) {
  const text = new TextShape(annotation);
  const textDrawn = text.draw();
  svg.add(textDrawn);
}

function overlayAnnotation(svg, annotation) {
  console.log(annotation);

  switch (annotation.type) {
    case 'draw':
      overlayDraw(svg, annotation);
      break;

    case 'geo':
      overlayGeo(svg, annotation);
      break;

    case 'highlight':
      overlayHighlight(svg, annotation);
      break;

    case 'line':
      overlayLine(svg, annotation);
      break;

    case 'arrow':
      overlayArrow(svg, annotation);
      break;

    case 'text':
      overlayText(svg, annotation);
      break;

    case 'note':
      overlaySticky(svg, annotation);
      break;

    default:
      logger.info(`Unknown annotation type ${annotation.type}.`);
      logger.info(annotation);
  }
}

function overlayAnnotations(svg, slideAnnotations) {
  // Sort annotations by lowest child index
  slideAnnotations = sortByKey(slideAnnotations, 'annotationInfo', 'index');

  for (const annotation of slideAnnotations) {
    switch (annotation.annotationInfo.type) {
      case 'group':
        // Get annotations that have this group as parent
        for (const childId of annotation.annotationInfo.children) {
          const childAnnotation =
          slideAnnotations.find((ann) => ann.id == childId);
          overlayAnnotation(svg, childAnnotation.annotationInfo);
        }

        break;

      default:
        // Add individual annotations if they don't belong to a group
        overlayAnnotation(svg, annotation.annotationInfo);
    }
  }
}

// Process the presentation pages and annotations into a PDF file
async function processPresentationAnnotations() {
  const client = redis.createClient({
    host: config.redis.host,
    port: config.redis.port,
    password: config.redis.password,
  });

  await client.connect();

  client.on('error', (err) => logger.info('Redis Client Error', err));

  // Get the annotations
  const annotations = fs.readFileSync(path.join(dropbox, 'whiteboard'));
  const whiteboard = JSON.parse(annotations);
  const pages = JSON.parse(whiteboard.pages);
  const ghostScriptInput = [];

  // Convert annotations to SVG
  for (const currentSlide of pages) {
    const bgImagePath = path.join(dropbox, `slide${currentSlide.page}`);
    const svgBackgroundSlide = path.join(exportJob.presLocation,
        'svgs', `slide${currentSlide.page}.svg`);
    const svgBackgroundExists = fs.existsSync(svgBackgroundSlide);
    const backgroundFormat = fs.existsSync(`${bgImagePath}.png`) ?
      'png' : 'jpeg';

    const dimensions = svgBackgroundExists ?
    probe.sync(fs.readFileSync(svgBackgroundSlide)) :
    probe.sync(fs.readFileSync(`${bgImagePath}.${backgroundFormat}`));

    const slideWidth = parseInt(dimensions.width, 10);
    const slideHeight = parseInt(dimensions.height, 10);

    const maxImageWidth = config.process.maxImageWidth;
    const maxImageHeight = config.process.maxImageHeight;

    const ratio = Math.min(maxImageWidth / slideWidth,
        maxImageHeight / slideHeight);
    const scaledWidth = slideWidth * ratio;
    const scaledHeight = slideHeight * ratio;

    // Create a window with a document and an SVG root node
    const window = createSVGWindow();
    const document = window.document;

    // Register window and document
    registerWindow(window, document);

    // Create the canvas (root SVG element)
    const canvas = svgCanvas(document.documentElement)
        .size(scaledWidth, scaledHeight)
        .attr({
          'xmlns': 'http://www.w3.org/2000/svg',
          'xmlns:xlink': 'http://www.w3.org/1999/xlink',
        });

    // Add the image element
    canvas
        .image(`file://${dropbox}/slide${currentSlide.page}.${backgroundFormat}`)
        .size(scaledWidth, scaledHeight);

    // Add a group element with class 'whiteboard'
    const whiteboard = canvas.group().attr({class: 'wb'});

    // 4. Overlay annotations onto slides
    overlayAnnotations(whiteboard, currentSlide.annotations);

    const svg = canvas.svg();

    // Write annotated SVG file
    const SVGfile = path.join(dropbox,
        `annotated-slide${currentSlide.page}.svg`);
    const PDFfile = path.join(dropbox,
        `annotated-slide${currentSlide.page}.pdf`);

    fs.writeFileSync(SVGfile, svg, function(err) {
      if (err) {
        return logger.error(err);
      }
    });

    // Scale slide back to its original size
    const convertAnnotatedSlide = [
      SVGfile,
      '--output-width', toPx(slideWidth),
      '--output-height', toPx(slideHeight),
      '-o', PDFfile,
    ];

    try {
      cp.spawnSync(config.shared.cairosvg,
          convertAnnotatedSlide, {shell: false});
    } catch (error) {
      logger.error(`Processing slide ${currentSlide.page}
        failed for job ${jobId}: ${error.message}`);
      statusUpdate.setError();
    }

    await client.publish(config.redis.channels.publish,
        statusUpdate.build(currentSlide.page));
    ghostScriptInput.push(PDFfile);
  }

  const outputDir = path.join(exportJob.presLocation, 'pdfs', jobId);

  // Create PDF output directory if it doesn't exist
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, {recursive: true});
  }

  const sanitizedFilename = sanitize(exportJob.filename.replace(/\s/g, '_'));
  const filenameWithExtension = `${sanitizedFilename}.pdf`;

  const mergePDFs = [
    '-dNOPAUSE',
    '-sDEVICE=pdfwrite',
    `-sOUTPUTFILE="${path.join(outputDir, filenameWithExtension)}"`,
    `-dBATCH`].concat(ghostScriptInput);

  // Resulting PDF file is stored in the presentation dir
  try {
    cp.spawnSync(config.shared.ghostscript, mergePDFs, {shell: false});
  } catch (error) {
    const errorMessage = 'GhostScript failed to merge PDFs in job' +
      `${jobId}: ${error.message}`;
    return logger.error(errorMessage);
  }

  // Launch Notifier Worker depending on job type
  logger.info(`Saved PDF at ${outputDir}/${jobId}/${filenameWithExtension}`);

  const notifier = new WorkerStarter({
    jobType: exportJob.jobType,
    jobId,
    filename: filenameWithExtension});

  notifier.notify();
  await client.disconnect();
}

processPresentationAnnotations();
