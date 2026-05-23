export function formatSmartNumber(num, decimals = 6) {
  if (num === null || num === undefined || isNaN(num)) return 'N/A';
  if (Math.abs(num - Math.round(num)) < 1e-9) return Math.round(num).toString();
  if (Math.abs(num) < 1e-10 && num !== 0) return num.toExponential(2);
  if (Math.abs(num) < 0.01) return num.toFixed(8);
  return num.toFixed(decimals);
}

export function formatExpression(expr) {
  if (!expr) return "";
  return expr.replace(/\*\*/g, "^");
}

export function formatFormula(formula) {
  if (!formula) return '';
  const superscripts = {
    '0': '⁰', '1': '¹', '2': '²', '3': '³', '4': '⁴',
    '5': '⁵', '6': '⁶', '7': '⁷', '8': '⁸', '9': '⁹'
  };
  return formula
    .replace(/\*\*/g, '^')
    .replace(/\*/g, '·')
    .replace(/sqrt/gi, '√')
    .replace(/\^(-?\d+)/g, (match, num) => {
      const sign = num.startsWith('-') ? '⁻' : '';
      const digits = num.replace('-', '');
      return sign + Array.from(digits).map(d => superscripts[d] || d).join('');
    });
}

export async function apiCall(url, body, onSuccess, errorPrefix= "Chyba"){
  try{
    const res = await fetch(url,{
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    const clonedRes= res.clone();
    let responseData;
    const contentType= res.headers.get("content-type");

    try{
      if(contentType && contentType.includes("application/json")){
        responseData = await res.json();
      }else{
        const textData= await res.text();
        responseData = { error: textData || `Server returned ${res.status}` };
      }

    }catch(parseError){
      try{
        const fallbackText = await clonedRes.text();
        responseData ={ error: fallbackText || `Parse error: ${parseError.message}` };

      }catch{
        responseData = { error: `HTTP ${res.status}` };
      }
    }

    if(!res.ok){
      alert(responseData.error || `${errorPrefix}: HTTP ${res.status}`);
      return;
    }

    if(responseData.error){
      alert(responseData.error);
    }else{
      onSuccess(responseData);
    }

  } catch (error){
    alert(`${errorPrefix}: ${error.message || 'Neznáma chyba servera'}`);
  }
}