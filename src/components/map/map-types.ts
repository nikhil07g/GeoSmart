export interface MapMarker {
  id: string;
  lat: number;
  lng: number;
  title: string;
  subtitle?: string | undefined;
  badge?: string | undefined;
  severity?: string | undefined;
  status?: string | undefined;
  href?: string | undefined;
  order?: number | undefined;
}

export interface MapCircle {
  id: string;
  lat: number;
  lng: number;
  radius: number;
  intensity: number;
  label?: string | undefined;
}

export interface MapViewProps {
  markers?: MapMarker[] | undefined;
  circles?: MapCircle[] | undefined;
  polyline?: Array<[number, number]> | undefined;
  center?: [number, number] | undefined;
  zoom?: number | undefined;
  className?: string | undefined;
  pickable?: boolean | undefined;
  onPick?: (lat: number, lng: number) => void | undefined;
  pickedPosition?: [number, number] | null | undefined;
}
