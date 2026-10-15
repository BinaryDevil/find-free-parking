// #12 will resolve place IDs inside approved coverage_areas, including every
// required source. Page registry, legacy polygons and requests cannot open it.
// There is deliberately no environment flag or client-controlled override.
export async function approvedParkingPlaceIds(): Promise<string[]> {
  return [];
}
