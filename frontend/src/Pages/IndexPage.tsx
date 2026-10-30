import { Link } from "react-router-dom"
import { useAtomValue } from "jotai"
import { RoutePaths } from "../RoutePaths"
import { authSettingsAtom } from "../Utils/Atoms/authSettingsAtom"
import { UserLayout } from "../Frames/UserLayout"
import { AuthSwitch } from "../Frames/AuthSwitch"


export const IndexPage = () => {
	return (
		<AuthSwitch
			authorized={
				<AuthorizedIndexPage />
			}
			anonymous={
				<AnonymousIndexPage />
			}
		/>)
}


// Index page for signed in users
const AuthorizedIndexPage = () => {
	const authSettings = useAtomValue(authSettingsAtom)

	return authSettings.isManaged
		? <UserLayout>
			<ManagedIndexPage isAnonymous={false} />
		</UserLayout>
		: <UserLayout>
			<SelfHostedIndexPage isAnonymous={false} />
		</UserLayout>
}


// Index page for anonymous users
const AnonymousIndexPage = () => {
	const authSettings = useAtomValue(authSettingsAtom)

	return <>
		<div className="navbar bg-base-200 shadow-sm sticky top-0 z-10">
			<div className="flex-1 text-3xl font-bold ml-2">
					My Personal Archive
			</div>
			<div className="flex-none">
				<Link className="profile-btn"
					id="profileBtn"
					to={RoutePaths.SignIn}
				>
					<div className="btn btn-primary">
						Sign in
					</div>
				</Link>
			</div>
		</div>
		<div className="container mx-auto">
			{ authSettings.isManaged
				? <ManagedIndexPage isAnonymous={true} />
				: <SelfHostedIndexPage isAnonymous={true}/>
			}
		</div>
	</>
}


const ManagedIndexPage = ({ isAnonymous }: { isAnonymous: boolean }) => {
	return (
		<div className="hero bg-base-200 overflow-x-clip">
			<div className="hero-content text-left">
				<div className="max-w-3xl mb-40">
					<MainMessage/>
					{ isAnonymous && <SelectManagedOrSelfHostedPage/> }
				</div>
			</div>
		</div>
		
	)
}


const SelfHostedIndexPage = ({ isAnonymous }: { isAnonymous: boolean }) => {
	return (
		<div className="hero bg-base-200 overflow-x-clip">
			<div className="hero-content text-left">
				<div className="max-w-3xl">
					<MainMessage/>
					{ isAnonymous &&
						<p>
							Contact your administrator for access.
						</p>
					}
				</div>
			</div>
		</div>
	)
}


const archiveHolds = [
	{ title: "Receipts & invoices", description: "Snap it, and it's filed, dated and searchable by shop, amount or item." },
	{ title: "Warranties & manuals", description: "Know what's covered, until when, and where the proof lives." },
	{ title: "Letters & official post", description: "Bills, tax, insurance, legal — scanned, tagged, never buried again." },
	{ title: "Family records", description: "Birth certificates, passports, medical notes, school paperwork." },
	{ title: "PDFs & scans", description: "Drag in a folder, or forward an email. We'll take it from there." },
	{ title: "Photos of paper", description: "Point your phone at a document; we'll clean it up and read the text." },
	{ title: "Email", description: "Forward the important ones in. They land in the right place." },
]


const howItWorks = [
	{ title: "Get it in.", description: "Upload, drag-and-drop, email it in, or scan with your phone. Bulk import from a folder if you're bringing years of history." },
	{ title: "We make sense of it.", description: "Documents are scanned and indexed automatically. Search by any word on the page — or by what you remember about it." },
	{ title: "Find it in seconds.", description: "Type \"boiler warranty\" or \"2023 tax\" and it's there. Share with a partner or family member when you need to." },
]


// Breaks out of the centered content column to span the full viewport width
const SectionDivider = () => (
	<hr className="my-20 relative left-1/2 w-screen -translate-x-1/2 border-gray-300" />
)


const MainMessage = () => (
	<>
		<h1 className="text-5xl font-bold mt-20">
			Everything that matters,
			<br/>
			in one place.
		</h1>
		<p className="mt-6">
			Life admin, receipts, warranties, important letters, family records — the paperwork of being a person, finally organised.
		</p>
		<p className="mt-2">
			Keep receipts, letters, PDFs, photos and email in one system you can actually search.
		</p>


		<AuthSwitch anonymous={
			<a href="#get-started" className="btn btn-primary btn-soft mt-6">
					Get Started
			</a>
		}/>

		<SectionDivider />

		<h1 className="text-5xl font-bold">
			You already have the documents.
			<br />
			You just can't find them.
		</h1>
		<p className="mt-6">
			The warranty is in an email. The receipt is a photo somewhere. The insurance letter is in a drawer you'd rather not open. The kids' vaccination records are in a portal you've forgotten the password to.
		</p>
		<p className="mt-2">
			Nothing is lost. It's just scattered across six places that don't talk to each other — and the moment you need something, you need it now.
		</p>

		<SectionDivider />

		<h1 className="text-5xl font-bold">
			What your archive holds
		</h1>
		<div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 mt-6">
			{archiveHolds.map(({ title, description }) => (
				<div key={title} className="card card-sm bg-base-100 shadow-sm">
					<div className="card-body">
						<h2 className="card-title">
							{title}
						</h2>
						<p>
							{description}
						</p>
					</div>
				</div>
			))}
		</div>

		<SectionDivider />

		<h1 className="text-5xl font-bold">
			How it works
		</h1>
		<ol className="mt-6 space-y-4">
			{howItWorks.map(({ title, description }, index) => (
				<li key={title} className="flex items-start gap-4">
					<span className="flex size-[1.7lh] shrink-0 items-center justify-center rounded-full bg-info/15 font-bold">
						{index + 1}
					</span>
					<p className="pt-[0.35lh]">
						<b>{title}</b>{" "}
						{description}
					</p>
				</li>
			))}
		</ol>

	</>
)


const SelectManagedOrSelfHostedPage = () => {
	const authSettings = useAtomValue(authSettingsAtom)

	return (
		<>
			<SectionDivider />

			<h2 id="get-started" className="mt-4 text-xl font-bold scroll-mt-36">
				Choose how you run it
			</h2>
			<p className="mt-2">
				Your archive. Your call. Same app, same search, same peace of mind — you just decide who holds the keys.
			</p>

			<div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
				<div className="card bg-base-100 shadow-sm row-span-2 grid grid-rows-subgrid gap-y-0">
					<div className="card-body pb-1">
						<h2 className="card-title">
							Managed
						</h2>
						<p className="font-bold">
							We host it. You get on with your life.
						</p>
						<p>
							Set up in under five minutes. Automatic backups, updates and mobile apps handled for you.
							Accessible from any device.
						</p>
					</div>
					<div className="card-body pt-1">
						<hr/>
						<p>
							<b>Best for:</b> most people. Especially if you'd rather not think about servers.
						</p>
						<a className="btn btn-primary m-2 mt-auto" href={`${authSettings.oidcRegisterUrl}?${new URLSearchParams({ returnUrl: RoutePaths.Archive.List })}`}>
							Create my archive
						</a>
					</div>
				</div>

				<div className="card bg-base-100 shadow-sm row-span-2 grid grid-rows-subgrid gap-y-0">
					<div className="card-body pb-1">
						<h2 className="card-title">
							Self-hosted
						</h2>
						<p className="font-bold">
							Your server. Your data. Nothing leaves your house.
						</p>
						<p>
							Run the whole thing on your own hardware — a home server, a NAS, a VPS, a Raspberry Pi.
							Your documents never touch our infrastructure, because there isn't any. You keep the database, the files and the backups.
						</p>
						<p>
							One command to install. Full API, Docker image, and a documented data format you can read without us.
						</p>
					</div>
					<div className="card-body pt-1">
						<hr/>
						<p>
							<b>Best for:</b> the technically comfortable, the privacy-first, and anyone who wants their family's records to outlive any company.
						</p>
						<a className="btn btn-soft m-2 mt-auto" href={`${authSettings.oidcRegisterUrl}?${new URLSearchParams({ returnUrl: RoutePaths.Archive.List })}`}>
							Read the self-hosting guide
						</a>
					</div>
				</div>
			</div>

			<div className="card bg-info/15 mt-6">
				<div className="card-body">
					<h2 className="card-title">
						Not sure? Switch whenever.
					</h2>
					<p>
						Start managed, migrate to self-hosted later — or the other way round. Your data exports in an open format either way. No lock-in, no hostage-taking, no "contact sales to leave".
					</p>
				</div>
			</div>
		</>
	)}
