export const THEME_STORAGE_KEY = "afm_theme";

const themeInit = `(function(){try{var t=localStorage.getItem("${THEME_STORAGE_KEY}");if(t!=="light"&&t!=="dark"){t=window.matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light"}document.documentElement.dataset.theme=t}catch(e){}})()`;

/** Runs before paint to avoid a light-mode flash on dark-theme reloads. */
export function ThemeScript() {
  return <script dangerouslySetInnerHTML={{ __html: themeInit }} />;
}
