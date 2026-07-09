import api from './axios';

// ── Zones CRUD ───────────────────────────────────────────────────────────────
export const listZones = (params = {}) =>
  api.get('/admin/zones', { params });

// Optimized for map — returns zones WITH polygons in one call
export const listZonesForMap = (params = {}) =>
  api.get('/admin/zones/map', { params });

export const getZone = (id) =>
  api.get(`/admin/zones/${id}`);

export const createZone = (data) =>
  api.post('/admin/zones', data);

export const updateZone = (id, data) =>
  api.patch(`/admin/zones/${id}`, data);

export const deleteZone = (id) =>
  api.delete(`/admin/zones/${id}`);

// ── Lifecycle ────────────────────────────────────────────────────────────────
export const activateZone = (id) =>
  api.post(`/admin/zones/${id}/activate`);

export const deactivateZone = (id) =>
  api.post(`/admin/zones/${id}/deactivate`);

export const testZoneCoord = (id, lat, lng) =>
  api.post(`/admin/zones/${id}/test`, { lat, lng });

// ── Vehicle Configs ──────────────────────────────────────────────────────────
export const listVehicleConfigs = (id) =>
  api.get(`/admin/zones/${id}/vehicle-configs`);

export const upsertVehicleConfigs = (id, configs) =>
  api.put(`/admin/zones/${id}/vehicle-configs`, { configs });

// ── Exit Gates ───────────────────────────────────────────────────────────────
export const listExits = (id) =>
  api.get(`/admin/zones/${id}/exits`);

export const createExit = (id, data) =>
  api.post(`/admin/zones/${id}/exits`, data);

export const updateExit = (id, exitId, data) =>
  api.patch(`/admin/zones/${id}/exits/${exitId}`, data);

export const deleteExit = (id, exitId) =>
  api.delete(`/admin/zones/${id}/exits/${exitId}`);

// ── Fixed Corridors ──────────────────────────────────────────────────────────
export const listCorridors = (id) =>
  api.get(`/admin/zones/${id}/corridors`);

export const createCorridor = (id, data) =>
  api.post(`/admin/zones/${id}/corridors`, data);

export const updateCorridor = (id, corridorId, data) =>
  api.patch(`/admin/zones/${id}/corridors/${corridorId}`, data);

export const deleteCorridor = (id, corridorId) =>
  api.delete(`/admin/zones/${id}/corridors/${corridorId}`);

// ── Analytics ────────────────────────────────────────────────────────────────
export const getZonesSummary = (days = 30) =>
  api.get('/admin/analytics/zones/summary', { params: { days } });

export const getZoneDetail = (id, days = 30) =>
  api.get(`/admin/analytics/zones/${id}/detail`, { params: { days } });

export const getDeadMileageBurn = (days = 30) =>
  api.get('/admin/analytics/zones/dead-mileage-burn', { params: { days } });

export const getCategoryRollup = (days = 30) =>
  api.get('/admin/analytics/zones/category-rollup', { params: { days } });

// ── Enums (for dropdowns) ────────────────────────────────────────────────────
export const ZONE_TYPES = [
  { value: 'airport',           label: 'Airport',           category: 'transport'      },
  { value: 'railway_station',   label: 'Railway Station',   category: 'transport'      },
  { value: 'metro_station',     label: 'Metro Station',     category: 'transport'      },
  { value: 'bus_terminal',      label: 'Bus Terminal',      category: 'transport'      },
  { value: 'tech_park',         label: 'Tech Park',         category: 'commercial'     },
  { value: 'mall',              label: 'Mall',              category: 'commercial'     },
  { value: 'industrial_zone',   label: 'Industrial Zone',   category: 'commercial'     },
  { value: 'hospital',          label: 'Hospital',          category: 'healthcare'     },
  { value: 'tourist_place',     label: 'Tourist Place',     category: 'tourism'        },
  { value: 'university',        label: 'University',        category: 'education'      },
  { value: 'border_checkpoint', label: 'Border Checkpoint', category: 'infrastructure' },
  { value: 'event_venue',       label: 'Event Venue',       category: 'infrastructure' },
  { value: 'custom',            label: 'Custom',            category: 'other'          },
];

export const ZONE_CATEGORIES = [
  { value: 'transport',      label: 'Transport'      },
  { value: 'commercial',     label: 'Commercial'     },
  { value: 'healthcare',     label: 'Healthcare'     },
  { value: 'tourism',        label: 'Tourism'        },
  { value: 'education',      label: 'Education'      },
  { value: 'infrastructure', label: 'Infrastructure' },
  { value: 'other',          label: 'Other'          },
];

export const LIFECYCLE_STATES = [
  { value: 'draft',          label: 'Draft',          color: '#6B7280' },
  { value: 'polygon_drawn',  label: 'Polygon Drawn',  color: '#3B82F6' },
  { value: 'configured',     label: 'Configured',     color: '#8B5CF6' },
  { value: 'active',         label: 'Active',         color: '#10B981' },
  { value: 'deprecated',     label: 'Deprecated',     color: '#F59E0B' },
  { value: 'archived',       label: 'Archived',       color: '#4B5563' },
];

export const VEHICLE_TYPES = ['bike', 'auto', 'car', 'xl', 'premium', 'luxury'];

export const CAPABILITIES = [
  { value: 'zone_entry_fee',        label: 'Zone Entry Fee (ATF-like)'         },
  { value: 'toll_pass_through',     label: 'Toll Pass-through'                  },
  { value: 'extended_wait',         label: 'Extended Wait Grace'                },
  { value: 'fixed_corridor',        label: 'Fixed Corridor Pricing'             },
  { value: 'meet_greet',            label: 'Meet & Greet'                       },
  { value: 'dead_mileage',          label: 'Dead Mileage Compensation'          },
  { value: 'platform_fee_override', label: 'Platform Fee Override (flat)'       },
];
