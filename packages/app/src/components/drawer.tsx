import {
  FloatingPortal,
  useDismiss,
  useFloating,
  useId,
  useInteractions,
} from "@floating-ui/react-dom-interactions";
import { Transition } from "@headlessui/react";
import type React from "react";
import { RemoveScroll } from "react-remove-scroll";
import { tinyassert } from "../utils/tinyassert";

// copied from https://github.com/hi-ogawa/youtube-dl-web-v2/blob/97a9e095350b28bd6daf5d0f8ecf6c00a364b94d/packages/app/src/components/drawer.tsx

export function Drawer(props: {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
}) {
  const { floating, context } = useFloating({
    open: props.open,
    onOpenChange: (open) => {
      tinyassert(!open); // should get only `open = false` via `useDismiss`
      props.onClose();
    },
  });
  const { getFloatingProps } = useInteractions([useDismiss(context)]);
  const id = useId();

  return (
    <FloatingPortal id={id}>
      <Transition show={props.open} className="z-[100]">
        {/* backdrop */}
        <Transition.Child
          className="transition duration-300 fixed inset-0 bg-black"
          enterFrom="opacity-0"
          enterTo="opacity-40"
          leaveFrom="opacity-40"
          leaveTo="opacity-0"
        />
        {/* content */}
        <RemoveScroll className="fixed inset-0 overflow-hidden">
          <Transition.Child
            // requires absolute width
            className="transition duration-300 transform w-[80%] max-w-[300px] h-full bg-[var(--colorBgContainer)] shadow-lg"
            enterFrom="translate-x-[-100%]"
            enterTo="translate-x-[0]"
            leaveFrom="translate-x-[0]"
            leaveTo="translate-x-[-100%]"
          >
            <div
              {...getFloatingProps({
                ref: floating,
                className: "w-full h-full",
              })}
            >
              {props.children}
            </div>
          </Transition.Child>
        </RemoveScroll>
      </Transition>
    </FloatingPortal>
  );
}
