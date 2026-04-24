export {};

declare module "react" {
  interface HTMLAttributes<T> extends AriaAttributes, DOMAttributes<T> {
    popover?: boolean | string;
    popovertarget?: string;
  }
}
