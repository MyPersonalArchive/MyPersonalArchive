import { useState } from "react"
import { Dialog } from "../Components/Dialog"
import { LightBox } from "../Components/LightBox"


export const ComponentTestPage = () => {
	return (
		<div>
			<header className="header">
				<h1>Component Test Page</h1>
				<div>This page is for testing and showcasing individual components.</div>
				<div>Source code at <span className="font-mono">frontend/src/Pages/ComponentTestPage.tsx</span></div>
			</header>

			<hr className="my-4" />

			<header className="header">
				<h2>Inside &lt;form&gt; or .form</h2>
			</header>

			<form>
				<ComponentTester />
			</form>

			{/* <hr className="my-10" />

			<header className="header">
				<h2 className="heading-2">Outside &lt;form&gt;</h2>
			</header>

			<div>
				<ComponentTester />
			</div> */}

		</div>
	)
}

const ComponentTester = () => {
	const [isDialogOpen, setIsDialogOpen] = useState(false)
	const [isLightBoxOpen, setIsLightboxOpen] = useState(false)

	return (
		<>
			<header className="header">
				<h1>Heading 1</h1>
				<div>Subtitle</div>
			</header>
			<header className="header">
				<h2>Heading 2</h2>
				<div>Subtitle</div>
			</header>
			<header className="header">
				<h3>Heading 3</h3>
				<div>Subtitle</div>
			</header>


			<div className="flex flex-row gap-2 my-4 items-baseline">
				<button className="btn btn-primary" type="button" onClick={() => setIsDialogOpen(true)}>Open dialog</button>
				<button className="btn btn-primary" type="button" onClick={() => setIsLightboxOpen(true)}>Open lightbox</button>
			</div>

			{isDialogOpen && <Dialog onClose={() => setIsDialogOpen(false)} closeOnEscape={true}>
				<div className="dialog-header">Dialog Title</div>
				<div className="dialog-content">
					This is the dialog!
				</div>
				<div className="dialog-footer flex flex-row">
					<div className="flex-1"></div>
					<button className="btn" type="button" onClick={() => setIsDialogOpen(false)}>Close</button>
				</div>
			</Dialog>}

			{isLightBoxOpen && <LightBox onClose={() => setIsLightboxOpen(false)}>
				<div className="bg-white text-black p-4">
					<p className="text-center">Use the <span className="code">&lt;LightBox&gt;</span> component to show content in a modal overlay.</p>
					<hr />
					<p className="text-center">Press <kbd>Esc</kbd> or click anywhere to close.</p>
				</div>
			</LightBox>}

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
					<button className="btn" type="button">Search</button>
				</div>
			</div>

			<div className="aligned-labels-and-inputs">
				<label></label>
				<div className="grouped">
					<button className="btn" type="button">Button 1</button>
					<button className="btn" type="button">Button 2</button>
					<button className="btn" type="button">Button 3</button>
				</div>
			</div>

			<div className="flex flex-row gap-2 my-4 items-baseline">
				<button className="btn items-center" type="button">Default</button>
				<div className="flex-1 text-center">
					← Use <span className="code">class="flex-1"</span> to push elements away →
				</div>
				<button className="btn btn-primary" type="button">Primary</button>
				<button className="btn btn-warning" type="button">Warning</button>
				<button className="btn btn-danger" type="button">Danger</button>
				<button className="btn" disabled type="button">Danger</button>
			</div>

			<div className="flex flex-row gap-2 my-4 items-baseline">
				<div className="flex-1">
					Use <span className="code">class="flex-1"</span> to push elements to the left →
				</div>
				<input type="text" className="input" />
			</div>

			<div className="input h-60 w-60 !flex flex-col items-center justify-center">
				<div>Make anything look</div>
				<div>like an input element</div>
				<div>with <span className="font-code">class="input"</span></div>
			</div>

			<div className="card w-full flex flex-row">
				<div className="w-40 h-30 bg-black text-red-500 font-code p-4 text-center">class="card"</div>
				<div className="p-2 grow relative">
					<div className="flex flex-col py-2 px-4">
						<div className="font-bold">Title</div>
						<div className=" text-sm">Subtext</div>
						<div className=" text-sm">More subtext</div>
					</div>


					<div className="absolute bottom-2 right-2 space-x-2">
						<button className="btn" type="button">Button 1</button>
						<button className="btn" type="button">Button 2</button>
					</div>

				</div>
			</div>

			<table className="table with-column-separators">
				<thead>
					<tr>
						<th>Column 1</th>
						<th>Column 2</th>
						<th>Column 3</th>
					</tr>
				</thead>
				<tbody>
					<tr>
						<td>Row 1, Cell 1</td>
						<td>Row 1, Cell 2</td>
						<td>Row 1, Cell 3</td>
					</tr>
					<tr>
						<td>Row 2, Cell 1</td>
						<td>Row 2, Cell 2</td>
						<td>Row 2, Cell 3</td>
					</tr>
					<tr>
						<td>Row 3, Cell 1</td>
						<td>Row 3, Cell 2</td>
						<td>Row 3, Cell 3</td>
					</tr>
				</tbody>
			</table>
		</>
	)
}