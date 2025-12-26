import { CSSProperties } from "react"

interface Props {
  src: string;
  style?: CSSProperties;
}

export const ImageViewer = ({ src, style }: Props) => {
	return (
		<img
			src={src}
			alt="Preview"
			style={{
				objectFit: "contain",
				...style
			}}
		/>
	)
}