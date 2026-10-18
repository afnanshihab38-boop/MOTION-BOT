/**
 * MOTION-BOT — Timeline State Manager
 * Observable state coordinator managing timeline playhead position, playback status,
 * selections, and viewport navigation.
 * Part of Phase 7.1: Timeline Architecture & State.
 */

import { Scene } from "@/types/scene";
import { Project } from "@/types/project";
import {
  ITimelineStateManager,
  TimelinePlaybackState,
  TimelineSelectionState,
  TimelineState,
  TimelineStateListener,
  TimelineStateOptions,
} from "./types";
import {
  clampTime,
  createInitialTimelineState,
  frameToTime,
  stepFrames,
  timeToFrame,
  updateCurrentTime,
  updateDuration,
  updatePlaybackState,
  updateSelection,
  updateViewport,
  updateWorkArea,
} from "./timeline-state";

/**
 * Concrete Timeline State Manager.
 * Observable, decoupled from UI and persistent storage, providing deterministic state transitions.
 */
export class TimelineManager implements ITimelineStateManager {
  private state: TimelineState;
  private readonly listeners: Set<TimelineStateListener> = new Set();
  private rafId: number | null = null;
  private timerId: ReturnType<typeof setTimeout> | null = null;
  private lastTickTimestamp: number | null = null;

  constructor(options: TimelineStateOptions = {}) {
    this.state = createInitialTimelineState(options);
  }

  /**
   * Returns a snapshot of the current immutable timeline state.
   */
  public getState(): TimelineState {
    return this.state;
  }

  /**
   * Updates internal state and notifies all subscribed listeners if state has changed.
   */
  private setState(nextState: TimelineState): void {
    if (this.state === nextState) {
      return;
    }
    this.state = nextState;
    this.notify();
  }

  /**
   * Broadcasts current state to all registered listeners.
   */
  private notify(): void {
    const currentState = this.state;
    for (const listener of this.listeners) {
      try {
        listener(currentState);
      } catch {
        // Defensive error handling so one faulty listener does not break state progression
      }
    }
  }

  /**
   * Subscribes to timeline state changes.
   * Returns an unsubscribe callback.
   */
  public subscribe(listener: TimelineStateListener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  /**
   * Updates the current playhead time in seconds (clamped to [0, duration]).
   * Does NOT mutate any persistent project or scene data.
   */
  public setCurrentTime(time: number): void {
    this.setState(updateCurrentTime(this.state, time));
  }

  /**
   * Updates the timeline duration in seconds and re-bounds playhead if necessary.
   */
  public setDuration(duration: number): void {
    this.setState(updateDuration(this.state, duration));
  }

  /**
   * Updates playback frame rate.
   */
  public setFps(fps: number): void {
    const safeFps = typeof fps === "number" && fps > 0 ? Math.round(fps) : 30;
    if (safeFps === this.state.fps) return;

    this.setState({
      ...this.state,
      fps: safeFps,
      currentFrame: timeToFrame(this.state.currentTime, safeFps),
      totalFrames: timeToFrame(this.state.duration, safeFps),
    });
  }

  /**
   * Sets playback state to "playing".
   * Automatically loops or jumps to inPoint if playhead is at outPoint/duration.
   */
  public play(): void {
    this.setState(updatePlaybackState(this.state, "playing"));
    this.startPlaybackLoop();
  }

  /**
   * Sets playback state to "paused", keeping the current playhead position.
   */
  public pause(): void {
    this.stopPlaybackLoop();
    this.setState(updatePlaybackState(this.state, "paused"));
  }

  /**
   * Sets playback state to "stopped" and resets playhead to inPoint or 0.
   */
  public stop(): void {
    this.stopPlaybackLoop();
    const stoppedState = updatePlaybackState(this.state, "stopped");
    this.setState({
      ...stoppedState,
      currentTime: this.state.inPoint,
      currentFrame: timeToFrame(this.state.inPoint, this.state.fps),
    });
  }

  /**
   * Advances the playback clock by a given delta in seconds (or 1/fps by default).
   * Respects loop, work area boundaries, and frame clamping.
   */
  public tick(deltaSec?: number): void {
    if (this.state.playbackState !== "playing") return;
    const step =
      typeof deltaSec === "number" && Number.isFinite(deltaSec) && deltaSec > 0
        ? deltaSec
        : 1 / this.state.fps;

    const nextTime = this.state.currentTime + step;
    const targetLimit = this.state.outPoint;

    if (nextTime >= targetLimit) {
      if (this.state.loop) {
        this.setCurrentTime(this.state.inPoint);
      } else {
        this.setCurrentTime(targetLimit);
        this.pause();
      }
    } else {
      this.setCurrentTime(nextTime);
    }
  }

  private startPlaybackLoop(): void {
    this.stopPlaybackLoop();
    this.lastTickTimestamp =
      typeof performance !== "undefined" ? performance.now() : Date.now();

    const loopTick = () => {
      if (this.state.playbackState !== "playing") {
        this.stopPlaybackLoop();
        return;
      }

      const now =
        typeof performance !== "undefined" ? performance.now() : Date.now();
      const deltaSec = this.lastTickTimestamp
        ? Math.max(0, (now - this.lastTickTimestamp) / 1000)
        : 1 / this.state.fps;
      this.lastTickTimestamp = now;

      const nextTime = this.state.currentTime + deltaSec;
      const targetLimit = this.state.outPoint;

      if (nextTime >= targetLimit) {
        if (this.state.loop) {
          this.setCurrentTime(this.state.inPoint);
          scheduleNext();
        } else {
          this.setCurrentTime(targetLimit);
          this.pause();
        }
      } else {
        this.setCurrentTime(nextTime);
        scheduleNext();
      }
    };

    const scheduleNext = () => {
      if (
        typeof window !== "undefined" &&
        typeof window.requestAnimationFrame === "function"
      ) {
        this.rafId = window.requestAnimationFrame(loopTick);
      } else if (typeof setTimeout === "function") {
        this.timerId = setTimeout(
          loopTick,
          Math.max(10, Math.floor(1000 / this.state.fps))
        );
        if (this.timerId && typeof (this.timerId as any).unref === "function") {
          (this.timerId as any).unref();
        }
      }
    };

    scheduleNext();
  }

  private stopPlaybackLoop(): void {
    if (this.rafId !== null && typeof window !== "undefined") {
      window.cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
    if (this.timerId !== null) {
      clearTimeout(this.timerId);
      this.timerId = null;
    }
    this.lastTickTimestamp = null;
  }

  /**
   * Destroys manager, terminates playback loop and detaches all listeners.
   */
  public destroy(): void {
    this.stopPlaybackLoop();
    this.listeners.clear();
  }

  /**
   * Seeks playhead directly to a specified timestamp in seconds.
   */
  public seek(time: number): void {
    this.setCurrentTime(time);
  }

  /**
   * Seeks playhead directly to a discrete frame number.
   */
  public seekFrame(frame: number): void {
    const time = frameToTime(frame, this.state.fps);
    this.setCurrentTime(time);
  }

  /**
   * Steps playhead forward by a discrete number of frames.
   */
  public stepForward(frames = 1): void {
    this.setState(stepFrames(this.state, Math.max(1, frames)));
  }

  /**
   * Steps playhead backward by a discrete number of frames.
   */
  public stepBackward(frames = 1): void {
    this.setState(stepFrames(this.state, -Math.max(1, frames)));
  }

  /**
   * Jumps playhead to the beginning of the timeline/work-area.
   */
  public jumpToStart(): void {
    this.setCurrentTime(this.state.inPoint);
  }

  /**
   * Jumps playhead to the end of the timeline/work-area.
   */
  public jumpToEnd(): void {
    this.setCurrentTime(this.state.outPoint);
  }

  /**
   * Focuses or clears track selection.
   */
  public selectTrack(trackId: string | null): void {
    this.setState(
      updateSelection(this.state, {
        selectedTrackId: trackId,
      })
    );
  }

  /**
   * Focuses or clears keyframe selection.
   */
  public selectKeyframe(keyframeId: string | null, trackId?: string | null): void {
    this.setState(
      updateSelection(this.state, {
        selectedKeyframeId: keyframeId,
        selectedKeyframeTrackId: trackId !== undefined ? trackId : this.state.selection.selectedKeyframeTrackId,
      })
    );
  }

  /**
   * Focuses or clears clip selection.
   */
  public selectClip(clipId: string | null): void {
    this.setState(
      updateSelection(this.state, {
        selectedClipId: clipId,
      })
    );
  }

  /**
   * Clears all track, clip, and keyframe selections.
   */
  public clearSelection(): void {
    this.setState(
      updateSelection(this.state, {
        selectedTrackId: null,
        selectedKeyframeId: null,
        selectedKeyframeTrackId: null,
        selectedClipId: null,
      })
    );
  }

  /**
   * Sets timeline zoom scale.
   */
  public setZoom(zoom: number): void {
    this.setState(updateViewport(this.state, { zoom }));
  }

  /**
   * Sets timeline horizontal and vertical scroll positions in pixels.
   */
  public setScrollPosition(scrollLeft: number, scrollTop?: number): void {
    this.setState(updateViewport(this.state, { scrollLeft, scrollTop }));
  }

  /**
   * Configures work area in-point and out-point in seconds.
   */
  public setWorkArea(inPoint?: number, outPoint?: number): void {
    this.setState(updateWorkArea(this.state, inPoint, outPoint));
  }

  /**
   * Configures looping behavior.
   */
  public setLoop(loop: boolean): void {
    if (this.state.loop === loop) return;
    this.setState({
      ...this.state,
      loop: Boolean(loop),
    });
  }

  /**
   * Synchronizes timeline duration and frame rate from an active Scene data model.
   * Does NOT mutate the input scene.
   */
  public syncWithScene(scene: Scene): void {
    if (!scene) return;

    const sceneDuration =
      typeof scene.duration === "number" && Number.isFinite(scene.duration) && scene.duration > 0
        ? scene.duration
        : this.state.duration;

    this.setState(updateDuration(this.state, sceneDuration));
  }

  /**
   * Synchronizes timeline duration and frame rate from a Project data model.
   * Does NOT mutate the input project.
   */
  public syncWithProject(project: Project): void {
    if (!project) return;

    const projectDuration =
      typeof project.duration === "number" && Number.isFinite(project.duration) && project.duration > 0
        ? project.duration
        : this.state.duration;

    const projectFps =
      typeof project.fps === "number" && Number.isFinite(project.fps) && project.fps > 0
        ? project.fps
        : this.state.fps;

    let updated = updateDuration(this.state, projectDuration);
    if (projectFps !== updated.fps) {
      updated = {
        ...updated,
        fps: projectFps,
        currentFrame: timeToFrame(updated.currentTime, projectFps),
        totalFrames: timeToFrame(updated.duration, projectFps),
      };
    }

    this.setState(updated);
  }
}

/**
 * Factory creating a new TimelineManager instance.
 */
export function createTimelineManager(
  options?: TimelineStateOptions
): ITimelineStateManager {
  return new TimelineManager(options);
}

/**
 * Default singleton instance of TimelineManager.
 */
export const defaultTimelineManager = new TimelineManager();
