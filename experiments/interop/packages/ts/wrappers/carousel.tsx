// Thin TS wrapper over carousel_slider.CarouselSlider: options flattened onto the component, slides as JSX children.
// 1 native node. Per render: `options` is rebuilt as one object from the flat props whenever any of them changes
// (23 keys copied by omit); children are forwarded as the `items` prop untouched.
import { omit } from "solid-js";
import { CarouselSlider, type CarouselOptions } from "~/_generated/carousel_slider";
import type { FuseChildren, FuseHandle } from "solid-fuse";

export type CarouselProps = CarouselOptions & {
  children?: FuseChildren;
  controller?: FuseHandle<"CarouselSliderController">;
  disableGesture?: boolean;
};

export function Carousel(props: CarouselProps) {
  const options = omit(props, "children", "controller", "disableGesture");
  return (
    <CarouselSlider
      options={{ ...options }}
      items={props.children}
      carouselController={props.controller}
      disableGesture={props.disableGesture}
    />
  );
}
