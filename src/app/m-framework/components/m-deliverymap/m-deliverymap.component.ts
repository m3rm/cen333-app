import {
  Component, Input, Output, EventEmitter,
  OnInit, OnChanges, SimpleChanges, AfterViewInit,
} from '@angular/core';
import { environment } from '../../../../environments/environments';
import { Delivery } from '../../../features/quickdispatch/delivery.model';
import { haversineDistance } from '../../../features/quickdispatch/distance.helper';

// App 4: declare const tells TypeScript that `google` is a global from the Maps script.
declare const google: any;

// Inject the Maps script once, even across reloads of this component.
let mapsScriptPromise: Promise<void> | null = null;
function loadGoogleMaps(apiKey: string): Promise<void> {
  if (typeof google !== 'undefined' && google.maps) {
    return Promise.resolve();
  }
  if (mapsScriptPromise) return mapsScriptPromise;
  mapsScriptPromise = new Promise<void>((resolve, reject) => {
    const tag = document.createElement('script');
    tag.src =
      `https://maps.googleapis.com/maps/api/js?key=${apiKey}&v=weekly`;
    tag.async = true;
    tag.defer = true;
    tag.onload = () => resolve();
    tag.onerror = (e) => reject(e);
    document.head.appendChild(tag);
  });
  return mapsScriptPromise;
}

// Google Maps wrapper for QuickDispatch.
// Inputs:  deliveries, selectedDeliveryId, generatingFor
// Outputs: mapClick, markerClick, generateClick
@Component({
  selector: 'm-deliverymap',
  standalone: true,
  imports: [],
  templateUrl: './m-deliverymap.component.html',
  styleUrl: './m-deliverymap.component.css',
})
export class MDeliverymapComponent
  implements OnInit, OnChanges, AfterViewInit {

  @Input() deliveries: Delivery[] = [];
  @Input() selectedDeliveryId: string | null = null;
  @Input() generatingFor: string | null = null;

  @Output() mapClick = new EventEmitter<{ lat: number; lng: number }>();
  @Output() markerClick = new EventEmitter<string>();
  @Output() generateClick = new EventEmitter<string>();

  // Unique id for the map div.
  mapId: string = '';

  // Live google.maps.* objects.
  private map: any;
  private warehouseMarker: any;
  private deliveryMarkers: Map<string, any> = new Map();
  private infoWindow: any;
  private polyline: any;
  private mapReady: boolean = false;

  ngOnInit() {
    this.mapId = 'map-' + Math.random().toString(36).substring(2, 9);
  }

  // Wait for the div, then load Maps and build.
  ngAfterViewInit() {
    setTimeout(async () => {
      await loadGoogleMaps(environment.googleMapsApiKey);
      this.initMap();
      this.mapReady = true;
      this.refreshDeliveryMarkers();
      this.refreshSelection();
    }, 50);
  }

  // Refresh on input changes.
  ngOnChanges(changes: SimpleChanges) {
    if (!this.mapReady) return;
    if (changes['deliveries']) {
      this.refreshDeliveryMarkers();
    }
    if (changes['selectedDeliveryId'] || changes['generatingFor'] || changes['deliveries']) {
      this.refreshSelection();
    }
  }

  // ---------- map build ----------
  private initMap() {
    const wh = environment.warehouse;

    // App 4: Google Maps JavaScript API — create the map instance.
    this.map = new google.maps.Map(
      document.getElementById(this.mapId),
      {
        center: { lat: wh.lat, lng: wh.lng },
        zoom: 12,
        clickableIcons: false,
      }
    );

    // App 4: Map marker — render the warehouse point on the map.
    this.warehouseMarker = new google.maps.Marker({
      position: { lat: wh.lat, lng: wh.lng },
      map: this.map,
      title: wh.name,
      icon: {
        path: google.maps.SymbolPath.BACKWARD_CLOSED_ARROW,
        scale: 8,
        fillColor: '#1565c0',
        fillOpacity: 1,
        strokeColor: '#ffffff',
        strokeWeight: 2,
      },
      zIndex: 1000,
    });

    // App 4: Info window — tappable popup that we attach to markers later.
    this.infoWindow = new google.maps.InfoWindow();

    // App 4: e.latLng.lat() / .lng() are methods (with parentheses), not properties.
    this.map.addListener('click', (e: any) => {
      this.mapClick.emit({
        lat: e.latLng.lat(),
        lng: e.latLng.lng(),
      });
    });
  }

  // ---------- markers ----------
  // Rebuild all delivery markers.
  private refreshDeliveryMarkers() {
    // Remove old markers.
    this.deliveryMarkers.forEach((m) => m.setMap(null));
    this.deliveryMarkers.clear();

    // App 4: Map markers — render delivery points, color them by priority.
    for (const d of this.deliveries) {
      if (!d.id) continue;
      const marker = new google.maps.Marker({
        position: { lat: Number(d.lat), lng: Number(d.lng) },
        map: this.map,
        title: d.customerName,
        icon: {
          path: google.maps.SymbolPath.CIRCLE,
          scale: 9,
          fillColor: this.priorityColor(d.priority),
          fillOpacity: 1,
          strokeColor: '#ffffff',
          strokeWeight: 2,
        },
      });

      marker.addListener('click', () => {
        this.markerClick.emit(d.id!);
      });

      this.deliveryMarkers.set(d.id, marker);
    }
  }

  // Standard=green, Express=amber, Urgent=red.
  private priorityColor(p: string): string {
    switch (p) {
      case 'Standard': return '#2e7d32';
      case 'Express':  return '#f9a825';
      case 'Urgent':   return '#c62828';
      default:         return '#666';
    }
  }

  // ---------- info window + polyline ----------
  private refreshSelection() {
    // Clear old route.
    if (this.polyline) {
      this.polyline.setMap(null);
      this.polyline = null;
    }
    if (!this.selectedDeliveryId) {
      this.infoWindow.close();
      return;
    }

    const d = this.deliveries.find((x) => x.id === this.selectedDeliveryId);
    if (!d) return;

    const wh = environment.warehouse;

    // App 4: Polyline — draws a route line between two points (warehouse → delivery).
    this.polyline = new google.maps.Polyline({
      path: [
        { lat: wh.lat, lng: wh.lng },
        { lat: Number(d.lat), lng: Number(d.lng) },
      ],
      strokeColor: '#1565c0',
      strokeOpacity: 0.9,
      strokeWeight: 4,
      map: this.map,
    });

    // Open info window on the selected marker.
    const marker = this.deliveryMarkers.get(d.id!);
    if (!marker) return;

    const distance = haversineDistance(wh.lat, wh.lng, Number(d.lat), Number(d.lng));
    const generating = this.generatingFor === d.id;

    // App 4: Info window content + attach it above the selected marker.
    const content = this.buildInfoWindowHtml(d, distance, generating);
    this.infoWindow.setContent(content);

    // Hook up the Generate button after the DOM is ready.
    google.maps.event.clearListeners(this.infoWindow, 'domready');
    this.infoWindow.addListener('domready', () => {
      const btn = document.getElementById(`gen-btn-${d.id}`);
      if (btn) {
        btn.addEventListener('click', () => {
          this.generateClick.emit(d.id!);
        });
      }
    });

    this.infoWindow.open(this.map, marker);
  }

  private buildInfoWindowHtml(d: Delivery, distance: number, generating: boolean): string {
    const priorityColor = this.priorityColor(d.priority);
    const instructionBlock = d.instruction
      ? `<p class="iw-instruction">${this.escapeHtml(d.instruction)}</p>`
      : '';
    const buttonBlock = d.instruction
      ? ''
      : `<button id="gen-btn-${d.id}" class="iw-gen-btn"
                ${generating ? 'disabled' : ''}>
           ${generating ? 'Generating…' : 'Generate Instructions'}
         </button>`;

    return `
      <div class="iw-wrap">
        <h4 class="iw-title">${this.escapeHtml(d.customerName)}</h4>
        <p class="iw-line"><b>Weight:</b> ${d.weight} kg</p>
        <p class="iw-line"><b>Priority:</b>
          <span class="iw-badge" style="background:${priorityColor}">${d.priority}</span>
        </p>
        <p class="iw-line"><b>Distance:</b> ${distance.toFixed(2)} km</p>
        ${instructionBlock}
        ${buttonBlock}
      </div>
    `;
  }

  // Escape user text before injecting into HTML.
  private escapeHtml(s: string): string {
    return String(s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }
}
