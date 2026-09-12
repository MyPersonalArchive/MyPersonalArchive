type Props = {
  src: string;
}
export const ImageViewer = ({ src }: Props) => {
	return (
		<img
			src={src}
			alt="Preview"
			className="object-contain w-full h-full"
		/>
	)
}