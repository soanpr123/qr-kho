export function addCode(items,code){code=code.trim();if(code)items.set(code,(items.get(code)||0)+1);return code;}
export function formatCodes(items){return [...items].map(([code,n])=>n>1?`${code} x ${n}`:code).join(', ');}
export function canAccept(state,code,now){if(code===state.code&&now-state.seen<1100){state.seen=now;return false;}state.code=code;state.seen=now;return true;}
