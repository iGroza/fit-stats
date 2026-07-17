import { parseFitBuffer } from './parseFit';
import { parseGpxBuffer } from './parseGpx';
import { thinPoints } from './thinPoints';
import type { Track } from './types';

/** Поддерживаемые форматы файлов треков. */
export const TRACK_FILE_RE = /\.(fit|gpx)$/i;

/** Разбирает файл трека по расширению: .fit (Garmin SDK) или .gpx (Apple Health и др.). */
export async function parseTrackBuffer(
  buffer: ArrayBuffer,
  fileName: string,
  color: string,
  sourceId: string
): Promise<Track> {
  const track = await (/\.gpx$/i.test(fileName)
    ? parseGpxBuffer(buffer, fileName, color, sourceId)
    : parseFitBuffer(buffer, fileName, color, sourceId));
  // Summary уже посчитан по полным точкам — в стейт кладём прореженный ряд.
  track.points = thinPoints(track.points);
  return track;
}
