import img from "../assets/receiptly_logo.png";


export const IndexPage = () => {
    return (
        <>
            {/* <Layout> */}
                <div className="indexpage">
                    <img src={img} alt="" />
                    <img src="../assets/receiptly_logo.png" alt="" />
                    <h1>Designed to keep your receipts organized and easily accessible.</h1>
                    <p>
                        Effortlessly organize and access your receipts with your digital receipt web app.
                        Upload pictures of your receipts, tag them, with quick access, and easy searching—all in one place.
                        Say goodbye to paper clutter and keep your receipts at your fingertips!
                    </p>
                </div>
            {/* </Layout> */}
        </>
    )
}