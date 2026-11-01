//! IPScans Cortex v3.0 — 8 Sector Packs, 73 Vision Rules (31 Local + 42 Ollama VLM),
//! and 8-Handle ROI / Tripwire Computational Geometry Engine.

use crate::json::json_str;

#[derive(Clone, Debug)]
pub struct SectorPack {
    pub id: &'static str,
    pub name_tr: &'static str,
    pub description_tr: &'static str,
    pub rule_ids: &'static [&'static str],
    pub recommended_vlm: &'static str,
}

#[derive(Clone, Copy, Debug, PartialEq)]
pub struct Point2D {
    pub x: f64,
    pub y: f64,
}

#[derive(Clone, Debug)]
pub struct RoiPolygon {
    pub id: String,
    pub name: String,
    pub vertices: Vec<Point2D>,
    pub tolerance_ratio: f64,
}

impl RoiPolygon {
    /// Ray-casting algorithm to determine whether a target centroid `(x, y)` lies inside the ROI polygon.
    pub fn contains_point(&self, pt: Point2D) -> bool {
        if self.vertices.len() < 3 {
            return false;
        }
        let mut inside = false;
        let n = self.vertices.len();
        let mut j = n - 1;
        for i in 0..n {
            let vi = self.vertices[i];
            let vj = self.vertices[j];
            let intersect = ((vi.y > pt.y) != (vj.y > pt.y))
                && (pt.x < (vj.x - vi.x) * (pt.y - vi.y) / ((vj.y - vi.y).abs().max(1e-9) * (vj.y - vi.y).signum()) + vi.x);
            if intersect {
                inside = !inside;
            }
            j = i;
        }
        inside
    }

    /// Computes the 8 calibration handle coordinates (4 corners + 4 midpoints) of the ROI's bounding box.
    pub fn compute_eight_handles(&self) -> [Point2D; 8] {
        let mut min_x = f64::INFINITY;
        let mut min_y = f64::INFINITY;
        let mut max_x = f64::NEG_INFINITY;
        let mut max_y = f64::NEG_INFINITY;

        for v in &self.vertices {
            if v.x < min_x { min_x = v.x; }
            if v.y < min_y { min_y = v.y; }
            if v.x > max_x { max_x = v.x; }
            if v.y > max_y { max_y = v.y; }
        }
        let mid_x = (min_x + max_x) * 0.5;
        let mid_y = (min_y + max_y) * 0.5;

        [
            Point2D { x: min_x, y: min_y }, // Top-Left
            Point2D { x: mid_x, y: min_y }, // Top-Center
            Point2D { x: max_x, y: min_y }, // Top-Right
            Point2D { x: max_x, y: mid_y }, // Middle-Right
            Point2D { x: max_x, y: max_y }, // Bottom-Right
            Point2D { x: mid_x, y: max_y }, // Bottom-Center
            Point2D { x: min_x, y: max_y }, // Bottom-Left
            Point2D { x: min_x, y: mid_y }, // Middle-Left
        ]
    }
}

/// Returns the 8 canonical Cortex v3.0 sector packs.
pub fn cortex_sector_packs() -> Vec<SectorPack> {
    vec![
        SectorPack {
            id: "residential",
            name_tr: "Site & Rezidans Güvenliği",
            description_tr: "Çevre ihlali, otopark, gece hareket, kapı önü bekleme ve tailgating paketi (6 Kural)",
            rule_ids: &["perimeter_breach", "night_motion", "loitering_gate", "tailgating_entry", "vehicle_wrong_way", "camera_tamper"],
            recommended_vlm: "gemma3:4b",
        },
        SectorPack {
            id: "pool",
            name_tr: "Havuz & Sosyal Tesis",
            description_tr: "Mesai dışı havuz erişimi, su kenarı düşme/hareketsizlik ve çocuk koruma paketi (5 Kural)",
            rule_ids: &["after_hours_pool", "poolside_slip_fall", "child_unattended_zone", "perimeter_climb", "emergency_exit_block"],
            recommended_vlm: "minicpm-v:8b",
        },
        SectorPack {
            id: "factory",
            name_tr: "Fabrika & Endüstriyel Saha",
            description_tr: "KKD baret/yelek denetimi, tehlikeli makine bölgesi, duman/alev ve düşme paketi (7 Kural)",
            rule_ids: &["ppe_helmet_missing", "ppe_vest_missing", "hazard_zone_entry", "smoke_fire_early", "worker_fall_down", "forklift_speed_corridor", "panel_door_open"],
            recommended_vlm: "qwen2.5vl:7b",
        },
        SectorPack {
            id: "warehouse",
            name_tr: "Depo & Lojistik Merkezi",
            description_tr: "Yükleme rampası, forklift-yaya ayrımı, bırakılan palet ve gece depo güvenliği (6 Kural)",
            rule_ids: &["loading_dock_intrusion", "forklift_pedestrian_proximity", "abandoned_cargo", "aisle_obstruction", "after_hours_warehouse", "camera_blinding"],
            recommended_vlm: "gemma3:4b",
        },
        SectorPack {
            id: "retail",
            name_tr: "Perakende & Mağaza",
            description_tr: "Kasa kuyruğu yoğunluğu, yüksek değerli raf bölgesi ve mesai dışı kasa güvenliği (5 Kural)",
            rule_ids: &["checkout_queue_threshold", "safe_zone_after_hours", "shelf_sweep_anomaly", "exit_door_backflow", "storefront_loitering"],
            recommended_vlm: "gemma3:4b",
        },
        SectorPack {
            id: "office",
            name_tr: "Ofis & Kurumsal Plaza",
            description_tr: "Turnike tailgating, sistem/sunucu odası erişimi ve gece kat koridoru denetimi (5 Kural)",
            rule_ids: &["turnstile_tailgating", "server_room_access", "after_hours_floor_motion", "fire_stairwell_prop", "reception_unattended"],
            recommended_vlm: "gemma3:4b",
        },
        SectorPack {
            id: "campus",
            name_tr: "Kampüs & Eğitim Kurumu",
            description_tr: "Bahçe sınırı, kalabalık kümelenme, yabancı araç girişi ve acil çıkış kontrolü (6 Kural)",
            rule_ids: &["campus_fence_breach", "crowd_clustering_alert", "unauthorized_gate_entry", "rooftop_access", "corridor_running_surge", "emergency_door_open"],
            recommended_vlm: "minicpm-v:8b",
        },
        SectorPack {
            id: "clinic",
            name_tr: "Klinik & Yaşlı Bakım Merkezi",
            description_tr: "Hasta düşme/bayılma, yataktan kalkma, koridor hareketsizlik ve ilaç odası denetimi (6 Kural)",
            rule_ids: &["patient_fall_detection", "bed_exit_night", "corridor_immobility", "pharmacy_room_access", "wandering_exit_alert", "staff_assistance_gesture"],
            recommended_vlm: "qwen2.5vl:7b",
        },
    ]
}

pub fn sector_packs_to_json() -> String {
    let items: Vec<String> = cortex_sector_packs()
        .iter()
        .map(|p| {
            let rules: Vec<String> = p.rule_ids.iter().map(|r| json_str(r)).collect();
            format!(
                "{{\"id\":{},\"name\":{},\"desc\":{},\"vlm\":{},\"rules\":[{}]}}",
                json_str(p.id),
                json_str(p.name_tr),
                json_str(p.description_tr),
                json_str(p.recommended_vlm),
                rules.join(",")
            )
        })
        .collect();
    format!("[{}]", items.join(","))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_roi_polygon_and_eight_handles() {
        let roi = RoiPolygon {
            id: "ROI-01".to_string(),
            name: "Ana Giris".to_string(),
            vertices: vec![
                Point2D { x: 100.0, y: 100.0 },
                Point2D { x: 300.0, y: 100.0 },
                Point2D { x: 300.0, y: 200.0 },
                Point2D { x: 100.0, y: 200.0 },
            ],
            tolerance_ratio: 0.12,
        };
        assert!(roi.contains_point(Point2D { x: 200.0, y: 150.0 }));
        assert!(!roi.contains_point(Point2D { x: 50.0, y: 50.0 }));

        let handles = roi.compute_eight_handles();
        assert_eq!(handles.len(), 8);
        assert_eq!(handles[0], Point2D { x: 100.0, y: 100.0 });
        assert_eq!(handles[4], Point2D { x: 300.0, y: 200.0 });
    }

    #[test]
    fn test_eight_sector_packs() {
        let packs = cortex_sector_packs();
        assert_eq!(packs.len(), 8);
    }
}
