import img from "../assets/receiptly_logo.png"


export const IndexPage = () => {
	return (
		<div className="jumbotron">
			<img src={img} alt="The logo!" />
			<header className="header">
				<h2>Designed to keep your receipts organized and easily accessible.</h2>
			</header>
			<p>
				Effortlessly organize and access your receipts with your digital receipt web app.
				Upload pictures of your receipts, tag them, with quick access, and easy searching—all in one place.
				Say goodbye to paper clutter and keep your receipts at your fingertips!
			</p>
		</div>
	)
}