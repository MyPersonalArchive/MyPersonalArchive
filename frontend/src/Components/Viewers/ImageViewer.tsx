import { CSSProperties } from "react"

interface Props {
  src: string;
  style?: CSSProperties;
}

export const ImageViewer = ({ src, style }: Props) => {
	return (
		<div>
			<img
				src={src}
				alt="Preview"
				style={{
					objectFit: "fill",
					...style
				}}
			/>
		</div>
	)
}