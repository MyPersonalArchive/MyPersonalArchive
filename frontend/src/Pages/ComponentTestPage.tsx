

export const ComponentTestPage = () => {
	return (
		<div>
			<h1>Component Test Page</h1>
			<p>This page is for testing and showcasing individual components.</p>

			<h2 className="heading-2">Inside &lt;form&gt; or .form</h2>
			<form>
				<ComponentTester />
			</form>

			<hr className="my-10" />

			<h2 className="heading-2">Outside &lt;form&gt;</h2>
			<div>
				<ComponentTester />
			</div>

		</div>
	)
}

const ComponentTester = () => {
	return (
		<>
			<div className="aligned-labels-and-inputs">
				<label htmlFor="id1">Title</label>
				<div className="grouped">
					<input type="text" id="id1" className="input" placeholder="Test input" />
					<select className="input">
						<option value="">Option 1</option>
						<option value="">Option 2</option>
						<option value="">Option 3</option>
					</select>
				</div>
			</div>

			<div className="aligned-labels-and-inputs">
				<label htmlFor="id2">Title</label>
				<div className="grouped">
					<input type="text" id="id2" className="input" placeholder="Test input" />
					<button className="btn">Test Button</button>
				</div>
			</div>

			<div className="aligned-labels-and-inputs">
				<label></label>
				<div className="grouped">
					<button className="btn">Button 1</button>
					<button className="btn">Button 2</button>
					<button className="btn">Button 3</button>
				</div>
			</div>

			<div className="flex flex-row gap-2 my-4">
				<button className="btn">Default</button>
				<div className="flex-1"></div>
				<button className="btn btn-primary">Primary</button>
				<button className="btn btn-warning">Warning</button>
				<button className="btn btn-danger">Danger</button>
			</div>
			
			<div className="input h-50 w-50 !flex flex-col items-center justify-center">
				<div>Just a box with</div>
				<div>.input</div>
			</div>



		</>
	)
}