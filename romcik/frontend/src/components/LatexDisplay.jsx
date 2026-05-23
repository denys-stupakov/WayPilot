import {useEffect, useRef} from "react";

export default function LatexDisplay({latex, style}) {
  const ref= useRef(null);

  useEffect(()=> {
    const el = ref.current;

    if(!el)
        return;
    const trySet = ()=>{

      if(typeof el.setValue === "function"){
        el.setValue(latex || "", { suppressChangeNotifications: true });
      }else{
        el.setAttribute("value", latex || "");
      }
    };

    if(el.isConnected)
        trySet();

    else el.addEventListener("mount", trySet, { once: true });
  }, [latex]);

  return (
    <math-field
      ref={ref}
      read-only
      style={{
        display: "inline-block",
        background: "transparent",
        border: "none",
        padding: 0,
        fontSize: "inherit",
        color: "inherit",
        minWidth: "1em",
        ...style,
      }}
    />
  );
}