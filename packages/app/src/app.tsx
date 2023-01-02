import React from "react";
import toast, { Toaster } from "react-hot-toast";
import { useAsync } from "react-use";
import { useAnimationFrameLoop } from "./utils/use-animation-frame-loop";
import { useStableRef } from "./utils/use-stable-ref";
import { useThemeState } from "./utils/use-theme-state";
import AUDIO_WORKLET_URL from "./audio-worklet/build/index.js?url";
import WASM_URL from "@hiogawa/demo-wasm/pkg/index_bg.wasm?url";
import {
  SoundfontProcessorEvent,
  SOUNDFONT_PROCESSOR_NAME,
} from "./audio-worklet/common";
import { Transition } from "@headlessui/react";
import { cls } from "./utils/misc";
import { parseMidiNote, stringifyMidiNote } from "./utils/conversion";
import { range } from "lodash";
import { tinyassert } from "./utils/tinyassert";

export function App() {
  return (
    <>
      <Toaster
        toastOptions={{
          className: "!bg-[var(--colorBgElevated)] !text-[var(--colorText)]",
        }}
      />
      <AppInner />
    </>
  );
}

const WEB_AUDIO_WARNING = "WEB_AUDIO_WARNING";

function AppInner() {
  //
  // initialize AudioContext and AudioNode
  //
  const [audio] = React.useState(() => {
    const audioContext = new AudioContext();
    const masterGainNode = new GainNode(audioContext, { gain: 1 });
    masterGainNode.connect(audioContext.destination);
    return { audioContext, masterGainNode };
  });

  const customNode = useCustomNode({
    audioContext: audio.audioContext,
    onSuccess: (node) => {
      node.connect(audio.masterGainNode);
    },
    onError: (e) => {
      console.error(e);
      toast.error("failed to load custom node");
    },
  });

  function sendNoteOn(key: number) {
    customNode.value?.port.postMessage({
      type: "note_on",
      key,
    } satisfies SoundfontProcessorEvent);
  }

  function sendNoteOff(key: number) {
    // TODO: avoid redundant note_off event
    customNode.value?.port.postMessage({
      type: "note_off",
      key,
    } satisfies SoundfontProcessorEvent);
  }

  //
  // synchronize AudioContext.state with UI
  //
  const [audioState, setAudioState] = React.useState(
    () => audio.audioContext.state
  );

  useAnimationFrameLoop(() => {
    if (audioState !== audio.audioContext.state) {
      setAudioState(audio.audioContext.state);
    }
    if (audio.audioContext.state === "running") {
      toast.dismiss(WEB_AUDIO_WARNING);
    }
  });

  // suggest enabling AudioContext when autoplay is not allowed
  React.useEffect(() => {
    if (audio.audioContext.state !== "running") {
      toast(
        "Web Audio is disabled until first user interaction.\nPlease start it either by pressing a left icon or hitting a space key.",
        {
          icon: (
            <button
              className="btn btn-ghost flex items-center"
              onClick={() => audio.audioContext.resume()}
            >
              <span className="i-ri-volume-up-line w-6 h-6"></span>
            </button>
          ),
          duration: Infinity,
          id: WEB_AUDIO_WARNING,
        }
      );
    }
  }, []);

  // keyboard shortcut
  useDocumentEvent("keyup", (e) => {
    if (e.key === " ") {
      // prevent space key to trigger button click
      e.preventDefault();
      e.stopPropagation();
      if (audioState === "suspended") {
        audio.audioContext.resume();
        return;
      }
    }
  });

  return (
    <div className="h-full w-full flex flex-col justify-center items-center gap-2 relative">
      <div className="absolute right-3 top-3 flex gap-3 flex items-center">
        <Transition
          appear
          show={customNode.loading}
          className="spinner w-5 h-5 transition duration-1000"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        />
        <button
          className="btn btn-ghost flex items-center"
          onClick={() => {
            if (audioState === "suspended") {
              audio.audioContext.resume();
            } else if (audioState === "running") {
              audio.audioContext.suspend();
            }
          }}
        >
          {audioState === "suspended" && (
            <span className="i-ri-volume-mute-line w-6 h-6"></span>
          )}
          {audioState === "running" && (
            <span className="i-ri-volume-up-line w-6 h-6"></span>
          )}
        </button>
        <ThemeSelectButton />
        <a
          className="flex items-center btn btn-ghost"
          href="https://github.com/hi-ogawa/web-audio-worklet-rust"
          target="_blank"
        >
          <span className="i-ri-github-line w-6 h-6"></span>
        </a>
      </div>
      <div
        className="w-full overflow-x-auto"
        ref={React.useCallback((el: HTMLDivElement | null) => {
          // scroll to C4 on mount
          if (el) {
            const c4 = el.querySelector("button[data-note=C4]");
            tinyassert(c4 instanceof HTMLElement);
            console.log(c4.offsetLeft, c4.offsetWidth);
            el.scrollTo({
              left: c4.offsetLeft - el.offsetWidth / 2 + c4.offsetWidth / 2,
              behavior: "auto",
            });
          }
        }, [])}
      >
        <KeyboardComponent sendNoteOn={sendNoteOn} sendNoteOff={sendNoteOff} />
      </div>
    </div>
  );
}

//
// KeyboardComponent
//

const NOTE_NUM_C1 = parseMidiNote("C1");

// trick is to pretend to have imaginary E# and B# keys
function getNoteOffsetX(note: number): number {
  return Math.floor(note / 12) * 14 + (note % 12) + Number(note % 12 >= 5);
}

function KeyboardComponent({
  sendNoteOn,
  sendNoteOff,
}: {
  sendNoteOn: (note: number) => void;
  sendNoteOff: (note: number) => void;
}) {
  // TODO: keyboard shortcut
  // TODO: highlight played notes
  // TODO: hover animation
  return (
    <div className="relative flex">
      {range(parseMidiNote("C1"), parseMidiNote("E9") + 1)
        .map((noteNum) => [noteNum, stringifyMidiNote(noteNum)] as const)
        .map(([noteNum, note]) =>
          note.includes("#") ? (
            // black key
            <button
              key={note}
              className="z-1 absolute top-0 bg-black flex-1 w-[44px] h-[120px] mx-[3px] rounded"
              style={{
                transform: `translateX(${
                  (50 / 2) *
                  (getNoteOffsetX(noteNum) - getNoteOffsetX(NOTE_NUM_C1))
                }px)`,
              }}
              onMouseDown={() => sendNoteOn(noteNum)}
              onMouseUp={() => sendNoteOff(noteNum)}
              onMouseLeave={() => sendNoteOff(noteNum)}
            ></button>
          ) : (
            // white key
            <button
              data-note={note} // scroll to C4 on mount
              key={note}
              className="bg-white flex-none w-[48px] h-[200px] mx-[1px] border border-gray-400 dark:border-transparent transition rounded inline-flex justify-center items-end"
              onMouseDown={() => sendNoteOn(noteNum)}
              onMouseUp={() => sendNoteOff(noteNum)}
              onMouseLeave={() => sendNoteOff(noteNum)}
            >
              {noteNum % 12 === 0 && <span className="text-black">{note}</span>}
            </button>
          )
        )}
    </div>
  );
}

//
// ThemeSelectButton
//

function ThemeSelectButton() {
  const [theme, setTheme] = useThemeState();
  return (
    <button
      className="flex items-center btn btn-ghost"
      disabled={!theme}
      onClick={() => {
        setTheme(theme === "dark" ? "light" : "dark");
      }}
    >
      <span
        className={cls(
          theme === "dark" ? "i-ri-sun-line" : "i-ri-moon-line",
          "w-6 h-6"
        )}
      ></span>
    </button>
  );
}

//
// utils
//

function useCustomNode({
  audioContext,
  onSuccess,
  onError,
}: {
  audioContext: AudioContext;
  onSuccess: (node: AudioWorkletNode) => void;
  onError: (e: unknown) => void;
}) {
  const onSuccessRef = useStableRef(onSuccess);
  const onErrorRef = useStableRef(onError);

  return useAsync(async () => {
    try {
      await audioContext.audioWorklet.addModule(AUDIO_WORKLET_URL);
      const res = await fetch(WASM_URL);
      const bufferSource = await res.arrayBuffer();
      const node = new AudioWorkletNode(
        audioContext,
        SOUNDFONT_PROCESSOR_NAME,
        {
          numberOfOutputs: 1,
          outputChannelCount: [2],
          processorOptions: { bufferSource }, // TODO: zero copy?
        }
      );
      onSuccessRef.current(node);
      return node;
    } catch (e) {
      onErrorRef.current(e);
      throw e;
    }
  });
}

function useDocumentEvent<K extends keyof DocumentEventMap>(
  type: K,
  handler: (e: DocumentEventMap[K]) => void
) {
  const handlerRef = useStableRef(handler);

  React.useEffect(() => {
    const handler = (e: DocumentEventMap[K]) => {
      handlerRef.current(e);
    };
    document.addEventListener(type, handler);
    return () => {
      document.removeEventListener(type, handler);
    };
  });
}
