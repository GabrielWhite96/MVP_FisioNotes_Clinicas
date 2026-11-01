export interface GeoCoordinates {
  lat: number
  lng: number
}

export interface MapsProvider {
  geocode(address: string): Promise<GeoCoordinates | null>
  getDirections(from: GeoCoordinates, to: GeoCoordinates): Promise<string | null>
}

export class MockMapsProvider implements MapsProvider {
  async geocode(_address: string): Promise<GeoCoordinates | null> {
    return null
  }

  async getDirections(_from: GeoCoordinates, _to: GeoCoordinates): Promise<string | null> {
    return null
  }
}

export const mapsProvider: MapsProvider = new MockMapsProvider()
