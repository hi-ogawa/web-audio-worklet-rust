import { Transition } from "@headlessui/react";
import React from "react";
import toast, { Toaster } from "react-hot-toast";
import { useAsync } from "react-use";
import { useAnimationFrameLoop } from "./utils/use-animation-frame-loop";
import { useStableRef } from "./utils/use-stable-ref";
import { useThemeState } from "./utils/use-theme-state";
import AUDIO_WORKLET_URL from "./audio-worklet/build/index.js?url";
import WASM_URL from "@hiogawa/demo-wasm/pkg/index_bg.wasm?url";
import { SINE_PROCESSOR_NAME } from "./audio-worklet/common";

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
    const masterGainNode = new GainNode(audioContext, { gain: 0 });
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
        "Web Audio is disabled before user interaction.\nPlease start it either by pressing a left icon or hitting a space key.",
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

  // master volume on/off
  const [isOn, setIsOn] = React.useState(false);

  async function toggle() {
    audio.masterGainNode.gain.linearRampToValueAtTime(
      isOn ? 0 : 1,
      audio.audioContext.currentTime + 0.1
    );
    setIsOn(!isOn);
  }

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
      toggle();
    }
  });

  return (
    <div className="h-full w-full flex justify-center items-center relative">
      <div className="absolute right-3 top-3 flex gap-3">
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
      {customNode.value && (
        <div className="w-full max-w-sm flex flex-col items-center gap-5 px-4">
          <button
            className="btn btn-primary w-full flex justify-center items-center py-0.5"
            disabled={audioState !== "running"}
            onClick={(e) => {
              e.stopPropagation();
              e.preventDefault();
              toggle();
            }}
          >
            {isOn ? (
              <span className="i-ri-pause-line w-6 h-6"></span>
            ) : (
              <span className="i-ri-play-line w-6 h-6"></span>
            )}
          </button>
        </div>
      )}
      <Transition
        className="absolute inset-0 flex justify-center items-center transition duration-1000 bg-[var(--colorBgElevated)]"
        show={customNode.loading}
        enterFrom="opacity-0"
        enterTo="opacity-100"
        leaveFrom="opacity-100"
        leaveTo="opacity-0"
      >
        <span className="spinner w-10 h-10 !border-4" />
      </Transition>
    </div>
  );
}

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
      const node = new AudioWorkletNode(audioContext, SINE_PROCESSOR_NAME, {
        processorOptions: { bufferSource }, // TODO: zero copy?
      });
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

function cls(...values: unknown[]): string {
  return values.filter(Boolean).join(" ");
}
