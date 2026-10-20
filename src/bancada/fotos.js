// Fotos da bancada (evolução e anamnese)

// fotos já baixadas nesta sessão (não pede de novo ao servidor)
export const cacheFotos = new Map();

// reduz a foto no próprio celular antes de enviar (máx. 1400 px, JPEG)
export function reduzirFoto(arquivo) {
  return new Promise((resolve, reject) => {
    if (!/^image\//.test(arquivo.type)) { reject(new Error('Escolha uma imagem.')); return; }
    const url = URL.createObjectURL(arquivo);
    const img = new Image();
    img.onload = () => {
      const max = 1400;
      const k = Math.min(1, max / Math.max(img.width, img.height));
      const c = document.createElement('canvas');
      c.width = Math.round(img.width * k);
      c.height = Math.round(img.height * k);
      c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
      URL.revokeObjectURL(url);
      resolve(c.toDataURL('image/jpeg', 0.82));
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Não foi possível ler a foto.')); };
    img.src = url;
  });
}
