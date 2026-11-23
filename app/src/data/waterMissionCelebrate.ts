import { WATER_MISSION_BONUS_COINS } from './waterMission'

export type WaterMissionCue = {
  dateKey: string
  bonusCoins: number
  goalMl: number
}

let pending: WaterMissionCue | null = null
let flushPaused = false
/** true enquanto a animação da missão está na tela */
let busyShowing = false

type Listener = () => void
const listeners = new Set<Listener>()

function emit() {
  listeners.forEach((l) => l())
}

export function subscribeWaterMission(listener: Listener) {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

export function setWaterMissionFlushPaused(paused: boolean) {
  if (flushPaused === paused) {
    if (!paused) emit()
    return
  }
  flushPaused = paused
  emit()
}

export function isWaterMissionFlushPaused() {
  return flushPaused
}

export function queueWaterMissionCelebration(dateKey: string, goalMl: number) {
  pending = {
    dateKey,
    bonusCoins: WATER_MISSION_BONUS_COINS,
    goalMl,
  }
  emit()
}

export function hasPendingWaterMission() {
  return pending != null
}

export function shiftWaterMissionCelebration(): WaterMissionCue | null {
  const next = pending
  pending = null
  busyShowing = next != null
  emit()
  return next
}

export function markWaterMissionCelebrationDone() {
  busyShowing = false
  emit()
}

export function isWaterMissionBusy() {
  return busyShowing || pending != null
}

export function clearWaterMissionCelebration() {
  pending = null
  flushPaused = false
  busyShowing = false
  emit()
}
