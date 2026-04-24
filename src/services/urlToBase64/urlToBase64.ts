export const fileToGDBase64 = (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    // @ts-ignore
    reader.onload = (e) => resolve(e.target.result.split(',')[1]); // Get the base64 content
    reader.onerror = (err) => reject(err);
    reader.readAsDataURL(file);
  });
}
