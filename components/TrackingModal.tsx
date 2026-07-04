"use client";

import { useState, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";

interface TrackingModalProps {
  isOpen: boolean;
  onClose: () => void;
  shipmentString: string;
}

const CARRIERS = [
  { id: "kr.cjlogistics", name: "CJ대한통운" },
  { id: "kr.lotte", name: "롯데택배" },
  { id: "kr.hanjin", name: "한진택배" },
  { id: "kr.epost", name: "우체국택배" },
  { id: "kr.logen", name: "로젠택배" },
  { id: "kr.kdexp", name: "경동택배" },
  { id: "kr.daesin", name: "대신택배" },
  { id: "kr.ilyanglogis", name: "일양로지스" },
];

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  information_received: { label: "배송준비중", color: "#9E9E9E", bg: "#F5F5F5" },
  at_pickup:            { label: "픽업완료",   color: "#1565C0", bg: "#E3F2FD" },
  in_transit:           { label: "이동중",      color: "#1565C0", bg: "#E3F2FD" },
  out_for_delivery:     { label: "배송중",      color: "#E65100", bg: "#FFF3E0" },
  delivered:            { label: "배송완료",    color: "#2E7D32", bg: "#E8F5E9" },
  attempt_fail:         { label: "배송실패",    color: "#C62828", bg: "#FFEBEE" },
  available_for_pickup: { label: "픽업가능",   color: "#6A1B9A", bg: "#F3E5F5" },
  exception:            { label: "예외처리",    color: "#C62828", bg: "#FFEBEE" },
};

function getStatus(id: string) {
  return STATUS_CONFIG[id] || { label: id, color: "#504530", bg: "#F5F0EB" };
}

function fmtDate(iso: string) {
  try {
    const d = new Date(iso);
    return `${d.getMonth()+1}.${d.getDate()} ${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
  } catch { return iso; }
}

// Icons as inline SVGs – no dependency on icon libraries
function IconX() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
      <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
    </svg>
  );
}
function IconBox() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"/>
      <path d="m3.3 7 8.7 5 8.7-5"/><path d="M12 22V12"/>
    </svg>
  );
}
function IconTruck() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <path d="M5 17H3a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11a2 2 0 0 1 2 2v3"/>
      <rect x="9" y="11" width="14" height="10" rx="2"/>
      <circle cx="12" cy="21" r="1"/><circle cx="20" cy="21" r="1"/>
    </svg>
  );
}
function IconCheck() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
      <path d="M20 6 9 17l-5-5"/>
    </svg>
  );
}
function IconAlert() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
    </svg>
  );
}

function getStatusIcon(id: string, color: string) {
  const style = { color };
  if (id === 'delivered') return <span style={style}><IconCheck /></span>;
  if (id === 'in_transit' || id === 'out_for_delivery') return <span style={style}><IconTruck /></span>;
  if (id === 'exception' || id === 'attempt_fail') return <span style={style}><IconAlert /></span>;
  return <span style={style}><IconBox /></span>;
}

export default function TrackingModal({ isOpen, onClose, shipmentString }: TrackingModalProps) {
  const [carrierId, setCarrierId] = useState("kr.cjlogistics");
  const [trackingNumber, setTrackingNumber] = useState("");
  const [loading, setLoading] = useState(false);
  const [trackingData, setTrackingData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    if (isOpen && shipmentString) {
      // Initialize state from props when opened
      let newCarrierId = "kr.cjlogistics";
      let newTrackingNumber = "";

      if (shipmentString.includes('|')) {
        const [cName, tNum] = shipmentString.split('|');
        newTrackingNumber = tNum.trim();
        const found = CARRIERS.find(c => c.name.includes(cName.trim()) || cName.trim().includes(c.name));
        if (found) {
          newCarrierId = found.id;
        }
      } else {
        newTrackingNumber = shipmentString.trim();
      }

      setTrackingNumber(newTrackingNumber);
      setCarrierId(newCarrierId);
      
      // Fetch immediately with the new values to avoid race conditions
      fetchTrackingData(newCarrierId, newTrackingNumber);
    } else if (!isOpen) {
      // Reset state when closed
      setTrackingData(null);
      setError(null);
      setTrackingNumber("");
    }
  }, [isOpen, shipmentString]);

  const fetchTrackingData = async (cId: string, tNum: string) => {
    if (!tNum) return;
    setLoading(true);
    setError(null);
    setTrackingData(null);
    try {
      const res = await fetch(`/api/tracking?carrierId=${cId}&trackId=${encodeURIComponent(tNum)}`);
      const json = await res.json();
      if (json.data?.message) throw new Error(json.data.message);
      if (!json.success) throw new Error(json.message || "조회 실패");
      setTrackingData(json.data);
    } catch (e: any) {
      setError(e.message || "배송조회에 실패했습니다.");
    } finally {
      setLoading(false);
    }
  };

  const fetchTracking = useCallback(() => {
    if (trackingNumber && carrierId) {
      fetchTrackingData(carrierId, trackingNumber);
    }
  }, [carrierId, trackingNumber]);

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [isOpen, onClose]);

  if (!mounted || !isOpen) return null;

  const progresses: any[] = trackingData?.progresses ? [...trackingData.progresses].reverse() : [];
  const state = trackingData?.state;
  const stateConf = state ? getStatus(state.id) : null;

  const modal = (
    <div
      style={{
        position: "fixed", inset: 0, zIndex: 99999,
        display: "flex", alignItems: "flex-end", justifyContent: "center",
        backgroundColor: "rgba(0,0,0,0.55)",
      }}
      onClick={onClose}
    >
      <div
        style={{
          backgroundColor: "#ffffff",
          width: "100%",
          maxWidth: "480px",
          borderRadius: "20px 20px 0 0",
          maxHeight: "90vh",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
          boxShadow: "0 -4px 32px rgba(0,0,0,0.18)",
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* ── Header ── */}
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "18px 20px 14px",
          borderBottom: "1px solid #f0ede9",
        }}>
          <div>
            <div style={{ fontSize: 17, fontWeight: 700, color: "#1d1b18" }}>배송조회</div>
            <div style={{ fontSize: 11, color: "#9e9e9e", marginTop: 2, letterSpacing: "0.12em", fontFamily: "monospace" }}>
              {trackingNumber}
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              width: 34, height: 34, borderRadius: "50%", border: "none",
              background: "none", cursor: "pointer", display: "flex",
              alignItems: "center", justifyContent: "center", color: "#757575",
            }}
          >
            <IconX />
          </button>
        </div>

        {/* ── Carrier row ── */}
        <div style={{
          display: "flex", alignItems: "center", gap: 10,
          padding: "10px 20px", background: "#fafaf9", borderBottom: "1px solid #f0ede9",
        }}>
          <span style={{ fontSize: 13, color: "#757575", whiteSpace: "nowrap" }}>택배사</span>
          <select
            value={carrierId}
            onChange={e => setCarrierId(e.target.value)}
            style={{
              flex: 1, fontSize: 13, color: "#1d1b18", background: "#fff",
              border: "1px solid #e0dbd6", borderRadius: 8,
              padding: "6px 10px", outline: "none",
            }}
          >
            {CARRIERS.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <button
            onClick={fetchTracking}
            disabled={loading}
            style={{
              padding: "7px 14px", borderRadius: 8, border: "none",
              background: "#695d46", color: "#fff", fontSize: 13,
              fontWeight: 600, cursor: loading ? "not-allowed" : "pointer",
              opacity: loading ? 0.6 : 1, whiteSpace: "nowrap",
            }}
          >
            조회
          </button>
        </div>

        {/* ── Body ── */}
        <div style={{ flex: 1, overflowY: "auto" }}>
          {loading ? (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "60px 20px", gap: 14 }}>
              <div style={{
                width: 36, height: 36, borderRadius: "50%",
                border: "3px solid #e8e1dc", borderTop: "3px solid #695d46",
                animation: "spin 0.8s linear infinite",
              }} />
              <p style={{ fontSize: 13, color: "#9e9e9e" }}>배송 정보를 조회하고 있습니다...</p>
              <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
            </div>
          ) : error ? (
            <div style={{ padding: "48px 24px", textAlign: "center" }}>
              <div style={{
                width: 52, height: 52, borderRadius: "50%", background: "#ffebee",
                display: "flex", alignItems: "center", justifyContent: "center",
                margin: "0 auto 14px", color: "#c62828",
              }}>
                <IconAlert />
              </div>
              <div style={{ fontSize: 15, fontWeight: 600, color: "#1d1b18", marginBottom: 6 }}>조회 결과가 없습니다</div>
              <div style={{ fontSize: 13, color: "#757575", lineHeight: 1.6 }}>{error}</div>
              <div style={{ fontSize: 12, color: "#bdbdbd", marginTop: 8 }}>택배사 또는 운송장 번호를 확인해 주세요.</div>
            </div>
          ) : trackingData ? (
            <div>
              {/* Status Banner */}
              {stateConf && (
                <div style={{
                  margin: "16px 20px",
                  background: stateConf.bg,
                  borderRadius: 14,
                  padding: "14px 16px",
                  display: "flex", alignItems: "center", gap: 12,
                }}>
                  <div style={{
                    width: 44, height: 44, borderRadius: 12, flexShrink: 0,
                    background: stateConf.color + "22",
                    display: "flex", alignItems: "center", justifyContent: "center",
                  }}>
                    {getStatusIcon(state.id, stateConf.color)}
                  </div>
                  <div>
                    <div style={{ fontSize: 19, fontWeight: 700, color: stateConf.color }}>
                      {stateConf.label}
                    </div>
                    <div style={{ fontSize: 12, color: "#757575", marginTop: 2 }}>
                      {trackingData.from?.name || trackingData.carrier?.name || ""} → {trackingData.to?.name || "고객님"}
                    </div>
                  </div>
                </div>
              )}

              {/* Timeline */}
              <div style={{ padding: "4px 20px 24px", position: "relative" }}>
                {/* vertical line */}
                {progresses.length > 1 && (
                  <div style={{
                    position: "absolute", left: 39, top: 24, bottom: 24,
                    width: 1, background: "#e8e1dc",
                  }} />
                )}

                {progresses.length === 0 ? (
                  <div style={{ textAlign: "center", padding: "24px 0", color: "#9e9e9e", fontSize: 13 }}>
                    상세 배송 기록이 없습니다.
                  </div>
                ) : progresses.map((p: any, i: number) => {
                  const isLatest = i === 0;
                  const cfg = getStatus(p.status?.id || "");
                  return (
                    <div key={i} style={{ display: "flex", gap: 14, alignItems: "flex-start", marginBottom: 18, position: "relative" }}>
                      {/* dot */}
                      <div style={{
                        width: 38, height: 38, borderRadius: "50%", flexShrink: 0,
                        display: "flex", alignItems: "center", justifyContent: "center",
                        background: isLatest ? cfg.color : "#f5f0eb",
                        border: `2px solid ${isLatest ? cfg.color : "#e8e1dc"}`,
                        zIndex: 1,
                        boxShadow: isLatest ? `0 0 0 4px ${cfg.color}22` : "none",
                      }}>
                        <span style={{ color: isLatest ? "#fff" : "#9e9e9e" }}>
                          {p.status?.id === 'delivered' ? <IconCheck /> :
                           (p.status?.id === 'in_transit' || p.status?.id === 'out_for_delivery') ? <IconTruck /> :
                           <IconBox />}
                        </span>
                      </div>
                      {/* text */}
                      <div style={{ flex: 1, paddingTop: 4 }}>
                        <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 8 }}>
                          <span style={{
                            fontSize: 14, fontWeight: isLatest ? 700 : 500,
                            color: isLatest ? "#1d1b18" : "#757575",
                          }}>
                            {p.status?.text || "–"}
                          </span>
                          <span style={{ fontSize: 11, color: "#bdbdbd", whiteSpace: "nowrap" }}>
                            {fmtDate(p.time)}
                          </span>
                        </div>
                        {p.description && (
                          <div style={{ fontSize: 12, color: "#9e9e9e", marginTop: 2, lineHeight: 1.5 }}>
                            {p.description}
                            {p.location?.name && p.location.name !== p.description && (
                              <span style={{ color: "#c8c0b8" }}> · {p.location.name}</span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div style={{ textAlign: "center", padding: "48px 20px", color: "#9e9e9e", fontSize: 13 }}>
              택배사를 선택 후 조회를 눌러주세요.
            </div>
          )}
        </div>
      </div>
    </div>
  );

  return createPortal(modal, document.body);
}
