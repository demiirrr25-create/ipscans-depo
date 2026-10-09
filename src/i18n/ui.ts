import messages from './ui-messages.json';
import type { Locale } from './config';
const copy: Record<string, Record<string,string>> = messages;
export function uiText(locale:Locale, english:string, turkish=english):string {
  if(locale==='tr') return turkish;
  if(locale==='en') return english;
  return copy[locale]?.[english] ?? english;
}
