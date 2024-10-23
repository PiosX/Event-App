export const processImage = async (imageDataUrl, width, height) => {
	return new Promise((resolve, reject) => {
		const img = new Image();
		img.onload = () => {
			const canvas = document.createElement("canvas");
			const ctx = canvas.getContext("2d");
			canvas.width = width;
			canvas.height = height;
			ctx.drawImage(img, 0, 0, width, height);
			canvas.toBlob(
				(blob) => {
					if (blob) {
						resolve(blob);
					} else {
						reject(new Error("Wystąpił błąd"));
					}
				},
				"image/webp",
				0.8
			);
		};
		img.onerror = () => reject(new Error("Błąd konwersji zdjęcia"));
		img.src = imageDataUrl;
	});
};
