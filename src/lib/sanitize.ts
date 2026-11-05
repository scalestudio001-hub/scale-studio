import "server-only";
import sanitizeHtml from "sanitize-html";

/** Limpia el HTML del editor de clases (solo etiquetas seguras). */
export function cleanHtml(html: string) {
  return sanitizeHtml(html, {
    allowedTags: ["h1", "h2", "h3", "h4", "p", "br", "strong", "b", "em", "i", "u", "s", "code", "pre", "ul", "ol", "li", "blockquote", "a", "img", "hr", "iframe", "div", "span"],
    allowedAttributes: {
      a: ["href", "target", "rel"],
      img: ["src", "alt", "width", "height"],
      iframe: ["src", "width", "height", "allow", "allowfullscreen", "frameborder"],
      div: ["data-youtube-video"],
      code: ["class"],
    },
    allowedIframeHostnames: ["www.youtube.com", "www.youtube-nocookie.com", "player.vimeo.com", "iframe.mediadelivery.net"],
    allowedSchemes: ["https", "http", "mailto"],
    transformTags: {
      a: (tagName, attribs) => ({ tagName, attribs: { ...attribs, target: "_blank", rel: "noopener noreferrer" } }),
    },
  });
}
