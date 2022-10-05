import Auth from '/imports/ui/services/auth';
import PresentationUploaderService from '/imports/ui/components/presentation/presentation-uploader/service';
import PadsService from '/imports/ui/components/pads/service';
import NotesService from '/imports/ui/components/notes/service';

const PADS_CONFIG = Meteor.settings.public.pads;
const PRESENTATION_CONFIG = Meteor.settings.public.presentation;

async function convertAndUpload() {
  const params = PadsService.getParams();
  const padId = await PadsService.getPadId(NotesService.ID);
  const extension = 'pdf';

  const exportUrl = Auth.authenticateURL(`${PADS_CONFIG.url}/p/${padId}/export/${extension}?${params}`);
  const sharedNotesAsFile = await fetch(exportUrl, { credentials: 'include' });

  const data = await sharedNotesAsFile.blob();

  let filename = 'Shared_Notes';
  const presentations = PresentationUploaderService.getPresentations();
  const duplicates = presentations.filter((pres) => pres.filename.startsWith(filename)).length;

  if (duplicates !== 0) { filename = `${filename}(${duplicates})`; }

  const sharedNotesData = new File([data], `${filename}.${extension}`, {
    type: data.type,
  });

  const presToUpload = [{
    file: sharedNotesData,
    isDownloadable: false,
    isRemovable: true,
    filename,
    isCurrent: true,
    conversion: { done: false, error: false },
    upload: { done: false, error: false, progress: 0 },
    exportation: { isRunning: false, error: false },
    onConversion: () => {},
    onUpload: () => {},
    onProgress: () => {},
    onDone: () => {},
  }];

  PresentationUploaderService.persistPresentationChanges(
    [],
    presToUpload,
    PRESENTATION_CONFIG.uploadEndpoint,
    'DEFAULT_PRESENTATION_POD',
  );

  return null;
}

export default {
  convertAndUpload,
};
