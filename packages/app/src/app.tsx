import React from "react";
import toast, { Toaster } from "react-hot-toast";
import { useAnimationFrameLoop } from "./utils/use-animation-frame-loop";
import { useStableRef } from "./utils/use-stable-ref";
import { useThemeState } from "./utils/use-theme-state";
import AUDIO_WORKLET_URL from "./audio-worklet/build/index.js?url";
import WASM_URL from "@hiogawa/demo-wasm/pkg/index_bg.wasm?url";
import { SOUNDFONT_PROCESSOR_NAME } from "./audio-worklet/common";
import { Transition } from "@headlessui/react";
import { cls } from "./utils/misc";
import { parseMidiNote, stringifyMidiNote } from "./utils/conversion";
import { range } from "lodash";
import { tinyassert } from "./utils/tinyassert";
import { Drawer } from "./components/drawer";
import { useForm } from "react-hook-form";
import { wrap, Remote, transfer } from "comlink";
import type { SoundfontProcessor } from "./audio-worklet/soundfont-processor";
import {
  QueryClient,
  QueryClientProvider,
  useQuery,
  useMutation,
} from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";

// TODO: refactor audio context management? it looks too messy to try to deal with all the logic inside UI.

export function App() {
  return (
    <ReactQueryProvider>
      <Toaster
        toastOptions={{
          className: "!bg-[var(--colorBgElevated)] !text-[var(--colorText)]",
        }}
      />
      <AppInner />
    </ReactQueryProvider>
  );
}

function ReactQueryProvider(props: React.PropsWithChildren) {
  const [queryClient] = React.useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            refetchOnWindowFocus: false,
            refetchOnReconnect: false,
            retry: 0,
          },
        },
      })
  );
  return (
    <QueryClientProvider client={queryClient}>
      {props.children}
      {import.meta.env.DEV && <ReactQueryDevtools />}
    </QueryClientProvider>
  );
}

const WEB_AUDIO_WARNING = "WEB_AUDIO_WARNING";

function AppInner() {
  //
  // initialize AudioContext and AudioNode
  //
  const [audio] = React.useState(() => {
    const audioContext = new AudioContext();
    const masterGainNode = new GainNode(audioContext, {
      gain: 1,
      channelCount: 2,
    });
    masterGainNode.connect(audioContext.destination);
    return { audioContext, masterGainNode };
  });

  const soundfontProcessorQuery = useQuery({
    queryKey: ["soundfontProcessorQuery"],
    queryFn: () => initializeSoundfontProcessor(audio.audioContext),
    onSuccess: ({ node }) => {
      node.connect(audio.masterGainNode);
    },
    onError: (e) => {
      console.error(e);
      toast.error("failed to load AudioWorkletNode");
    },
    staleTime: Infinity,
    cacheTime: Infinity,
  });

  function sendNoteOn(key: number) {
    soundfontProcessorQuery.data?.processor.noteOn(key);
  }

  function sendNoteOff(key: number) {
    soundfontProcessorQuery.data?.processor.noteOff(key);
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

  const [menuOpen, setMenuOpen] = React.useState(false);

  return (
    <div className="h-full w-full flex flex-col relative">
      <header className="w-full flex justify-end items-center p-2 px-4 shadow-md shadow-black/[0.05] dark:shadow-black/[0.7]">
        <button
          className="pl-1 pr-3 py-1 btn btn-ghost flex items-center"
          onClick={() => setMenuOpen(true)}
        >
          <span className="i-ri-menu-line w-5 h-5"></span>
        </button>
        <h1 className="text-xl">Soundfont Player</h1>
        <div className="flex-1"></div>
        <div className="flex gap-3 flex items-center">
          <Transition
            appear
            show={soundfontProcessorQuery.isLoading}
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
      </header>
      <Drawer open={menuOpen} onClose={() => setMenuOpen(false)}>
        <div className="flex flex-col py-2 gap-4">
          <div className="pl-5 py-1">
            <button
              className="btn btn-ghost flex items-center"
              onClick={() => setMenuOpen(false)}
            >
              <span className="i-ri-menu-line w-5 h-5"></span>
            </button>
          </div>
          {/* TOOD: this UI doesn't have to be in drawer unless it is in small screen device */}
          {/* TODO: maybe use drawer but non-overlay type? */}
          <SoundfontSelectComponent
            processor={soundfontProcessorQuery.data?.processor}
          />
          <div className="border-t mx-2"></div>
          <div className="flex flex-col gap-2 px-4">
            <span>
              Gain <span className="text-gray-400">= 0.5 dB</span>
            </span>
            <input type="range" min="-20" max="10" step="0.5" />
          </div>
        </div>
      </Drawer>
      <main className="flex-1 flex items-center relative">
        <KeyboardComponent sendNoteOn={sendNoteOn} sendNoteOff={sendNoteOff} />
        <Transition
          show={soundfontProcessorQuery.isLoading || audioState !== "running"}
          className="absolute inset-0 flex justify-center items-center transition duration-500 bg-black/[0.15] dark:bg-black/[0.5]"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        ></Transition>
      </main>
    </div>
  );
}

//
// SoundfontSelectComponent
//

function SoundfontSelectComponent({
  processor,
}: {
  processor?: Remote<SoundfontProcessor>;
}) {
  const form = useForm<{ fileList?: FileList; soundfontName: string }>({
    defaultValues: {
      fileList: undefined,
      soundfontName: "",
    },
  });
  const formValues = form.watch();
  const file = formValues.fileList?.[0];
  const soundfontName = formValues.soundfontName;

  React.useEffect(() => {
    if (file) {
      addSoundfontMutation.mutate(file);
    }
  }, [file]);

  const getStateQuery = useQuery({
    queryKey: ["getStateQuery"],
    queryFn: async () => {
      tinyassert(processor);
      return processor.getState();
    },
    onError: () => {
      toast.error("failed to load state");
    },
    enabled: Boolean(processor),
  });

  React.useEffect(() => {
    if (!formValues.soundfontName && getStateQuery.data?.current_soundfont) {
      form.setValue("soundfontName", getStateQuery.data.current_soundfont);
    }
  }, [formValues.soundfontName, getStateQuery.data]);

  const addSoundfontMutation = useMutation(
    async (file: File) => {
      tinyassert(processor);
      const name = file.name ?? "(unknown file)";
      const arrayBuffer = await file.arrayBuffer();
      await processor.addSoundfont(name, transfer(arrayBuffer, [arrayBuffer]));
    },
    {
      onSuccess: () => {
        getStateQuery.refetch();
      },
      onError: (e) => {
        console.error(e);
        toast.error("failed to load soundfont");
      },
    }
  );

  const setPresetMutation = useMutation(
    async (args: [name: string, bank: number, preset: number]) => {
      tinyassert(processor);
      await processor?.setPreset(...args);
    },
    {
      onSuccess: () => {
        getStateQuery.refetch();
      },
      onError: (e) => {
        console.error(e);
        toast.error("failed to set instrument");
      },
    }
  );

  const presets =
    getStateQuery.data &&
    getStateQuery.data.soundfonts.get(soundfontName)?.presets;

  return (
    <>
      <div className="flex flex-col gap-2 px-4">
        {/* TODO: how to suggest to use FluidR3_GM.sf2 by default? */}
        <div className="flex flex-col">
          <span className="text-lg">Soundfont</span>
          {/* prettier-ignore */}
          <div className="text-sm px-2 text-[var(--colorTextSecondary)]">
            You can find free soundfont files e.g. from <a className="link" href="https://github.com/FluidSynth/fluidsynth/wiki/SoundFont" target="_blank">FluidSynth Wiki</a> and <a className="link" href="https://musical-artifacts.com" target="_blank">musical-artifacts.com</a>.<br/>
          </div>
        </div>
        <input className="mb-2" type="file" {...form.register("fileList")} />
        <select {...form.register("soundfontName")}>
          <option value="">-- select --</option>
          {getStateQuery.isSuccess &&
            [...getStateQuery.data.soundfonts.keys()].map((key) => (
              <option key={key} value={key}>
                {key}
              </option>
            ))}
        </select>
      </div>
      <div className="flex flex-col gap-2 px-4">
        <span className="text-lg">Instrument</span>
        <select
          value={[
            getStateQuery.data?.current_soundfont,
            getStateQuery.data?.current_bank,
            getStateQuery.data?.current_preset,
          ].join("-")}
          onChange={(e) => {
            const preset = presets?.[e.target.selectedIndex];
            tinyassert(preset);
            setPresetMutation.mutate([soundfontName, preset[1], preset[2]]);
          }}
        >
          <option>-- select --</option>
          {presets?.map((preset) => (
            <option
              key={JSON.stringify(preset)}
              value={[soundfontName, preset[1], preset[2]].join("-")}
            >
              {preset[1]} - {preset[2]}&nbsp;&nbsp;&nbsp;{preset[0]}
            </option>
          ))}
        </select>
      </div>
    </>
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

function isBlackKey(note: number): boolean {
  return [1, 3, 6, 8, 10].includes(note % 12);
}

const KEY_SHORTCUT_MAPPING = new Map<string, number>([
  // C4..
  ..."zsxdcvgbhnjm,l."
    .split("")
    .map((key, i) => [key, NOTE_NUM_C1 + 12 * 3 + i] as const),
  // C5..
  ..."q2w3er5t6y7ui9o0p"
    .split("")
    .map((key, i) => [key, NOTE_NUM_C1 + 12 * 4 + i] as const),
]);

function KeyboardComponent({
  sendNoteOn,
  sendNoteOff,
}: {
  sendNoteOn: (note: number) => void;
  sendNoteOff: (note: number) => void;
}) {
  // TODO: manage note states internally within this component so that it can be used for highlighting UI and avoiding duplicate events.
  // TODO: highlight on hover/play
  // TODO: tweak key geometry (width/height)

  // scroll to key C4 on mount
  const refScrollOnMount = React.useCallback((el: HTMLDivElement | null) => {
    if (el) {
      const c4 = el.querySelector("[data-note=C4]");
      tinyassert(c4 instanceof HTMLElement);
      el.scrollTo({
        left: c4.offsetLeft - el.offsetWidth / 2 + c4.offsetWidth / 2,
        behavior: "auto",
      });
    }
  }, []);

  // keyboard shortcut
  useDocumentEvent("keydown", (e) => {
    if (e.repeat || e.altKey || e.ctrlKey || e.metaKey || e.shiftKey) {
      return;
    }
    const found = KEY_SHORTCUT_MAPPING.get(e.key);
    if (found) {
      e.preventDefault();
      e.stopPropagation();
      sendNoteOn(found);
    }
  });
  useDocumentEvent("keyup", (e) => {
    if (e.repeat || e.altKey || e.ctrlKey || e.metaKey || e.shiftKey) {
      return;
    }
    const found = KEY_SHORTCUT_MAPPING.get(e.key);
    if (found) {
      e.preventDefault();
      e.stopPropagation();
      sendNoteOff(found);
    }
  });

  const isTouchScreen = useMatchMedia({
    query: "(pointer: coarse)",
    defaultValue: false,
  });

  return (
    <div
      // use webkit-scrollbar to avoid overlay scrollbar (otherwise, users cannot scroll keyboard on touch screen device)
      className="w-full overflow-x-scroll scrollbar pb-2 max-h-[200px] h-full"
      ref={refScrollOnMount}
    >
      <div className="z-0 relative flex select-none touch-none h-full">
        {range(parseMidiNote("C1"), parseMidiNote("E9") + 1)
          .map((noteNum) => [noteNum, stringifyMidiNote(noteNum)] as const)
          .map(([noteNum, note]) => (
            <button
              key={note}
              data-note={note} // scroll to C4 on mount
              className={
                isBlackKey(noteNum)
                  ? "z-1 absolute top-0 bg-black flex-1 w-[44px] h-[60%] mx-[3px] rounded rounded-t-none"
                  : "bg-white flex-none w-[48px] h-full mx-[1px] border border-gray-400 dark:border-transparent transition rounded rounded-t-none inline-flex justify-center items-end"
              }
              style={
                isBlackKey(noteNum)
                  ? {
                      // prettier-ignore
                      transform: `translateX(${(50 / 2) * (getNoteOffsetX(noteNum) - getNoteOffsetX(NOTE_NUM_C1))}px)`,
                    }
                  : {}
              }
              onTouchStart={() => {
                if (!isTouchScreen) return;
                sendNoteOn(noteNum);
              }}
              onTouchMove={() => {}} // TODO
              onTouchEnd={() => {
                if (!isTouchScreen) return;
                sendNoteOff(noteNum);
              }}
              onTouchCancel={() => {
                if (!isTouchScreen) return;
                sendNoteOff(noteNum);
              }}
              onMouseDown={() => {
                if (isTouchScreen) return;
                sendNoteOn(noteNum);
              }}
              onMouseMove={() => {}} // TODO
              onMouseUp={() => {
                if (isTouchScreen) return;
                sendNoteOff(noteNum);
              }}
              onMouseLeave={() => {
                if (isTouchScreen) return;
                sendNoteOff(noteNum);
              }}
            >
              {noteNum % 12 === 0 && <span className="text-black">{note}</span>}
            </button>
          ))}
      </div>
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

async function initializeSoundfontProcessor(
  audioContext: AudioContext
): Promise<{
  node: AudioWorkletNode;
  processor: Remote<SoundfontProcessor>;
}> {
  await audioContext.audioWorklet.addModule(AUDIO_WORKLET_URL);
  const res = await fetch(WASM_URL);
  const bufferSource = await res.arrayBuffer();
  const node = new AudioWorkletNode(audioContext, SOUNDFONT_PROCESSOR_NAME, {
    numberOfOutputs: 1,
    outputChannelCount: [2],
  });
  const processor = wrap<SoundfontProcessor>(node.port);
  await processor.initialize(transfer(bufferSource, [bufferSource]));
  return { node, processor };
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

// https://github.com/hi-ogawa/ameblo-stats/blob/45a076a17c46473bb6ff41a64880a74b4dd0b52c/src/routes/index.page.tsx#L728
function useMatchMedia({
  query,
  defaultValue,
}: {
  query: string;
  defaultValue: boolean;
}): boolean {
  const [ok, setOk] = React.useState(defaultValue);
  React.useEffect(() => {
    const result = window.matchMedia(query);
    const handler = (e: { matches: boolean }) => {
      setOk(e.matches);
    };
    handler(result);
    result.addEventListener("change", handler);
    return () => {
      result.addEventListener("change", handler);
    };
  }, []);
  return ok;
}
