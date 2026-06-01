import { Fragment } from "react";

// Add zero-width break opportunities after slashes/hyphens so long compound
// words like "Flexibility/Stretching" wrap at the separator instead of being
// hyphenated mid-word.
export function softBreak(text: string) {
  const parts = text.split(/(?<=[/\\\-–—])/);
  return parts.map((p, i) => (
    <Fragment key={i}>
      {p}
      {i < parts.length - 1 && <wbr />}
    </Fragment>
  ));
}
