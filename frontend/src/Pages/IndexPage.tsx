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
		<div className="navbar bg-base-100 shadow-sm">
			<div className="flex-1">
				<a className="btn btn-ghost text-xl">
					My Personal Archive
				</a>
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
		{ authSettings.isManaged
			? <ManagedIndexPage isAnonymous={true} />
			: <SelfHostedIndexPage isAnonymous={true}/>
		}
	</>
}


const ManagedIndexPage = ({ isAnonymous }: { isAnonymous: boolean }) => {
	return (
		<div className="hero bg-base-200">
			<div className="hero-content text-center">
				<div className="max-w-3xl">
					<MainMessage/>
					{ isAnonymous && <SelectManagedOrSelfHostedPage/> }
				</div>
			</div>
		</div>
		
	)
}


const SelfHostedIndexPage = ({ isAnonymous }: { isAnonymous: boolean }) => {
	return (
		<div className="hero bg-base-200">
			<div className="hero-content text-center">
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


const MainMessage = () => (
	<>
		<h1 className="text-5xl font-bold">
			Everything that matters,<br/>in one place.
		</h1>
		<p className="mt-6">
			Life admin, receipts, warranties, important letters, family records — the paperwork of being a person, finally organised.
		</p>
		<p className="mt-2">
			Keep receipts, letters, PDFs, photos and email in one system you can actually search.
		</p>
	</>
)


const SelectManagedOrSelfHostedPage = () => {
	const authSettings = useAtomValue(authSettingsAtom)

	return (
		<>
			<hr className="my-6"/>
			<h2 className="mt-4 text-xl font-bold">
				Choose how you run it
			</h2>
			<p className="mt-2">
				Your archive. Your call. Same app, same search, same peace of mind — you just decide who holds the keys.
			</p>

			<div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6 text-left">
				<div className="card bg-base-100 shadow-sm">
					<div className="card-body">
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
						<hr/>
						<p>
							<b>Best for:</b> most people. Especially if you'd rather not think about servers.
						</p>
						<a className="btn btn-primary btn-soft m-2" href={`${authSettings.oidcRegisterUrl}?${new URLSearchParams({ returnUrl: RoutePaths.Archive.List })}`}>
							Create my archive
						</a>

					</div>
				</div>

				<div className="card bg-base-100 shadow-sm">
					<div className="card-body">
						<h2 className="card-title">
							Self-hosted
						</h2>
						<p className="font-bold">Your server. Your data. Nothing leaves your house.</p>
						<p>
							Run the whole thing on your own hardware — a home server, a NAS, a VPS, a Raspberry Pi.
							Your documents never touch our infrastructure, because there isn't any. You keep the database, the files and the backups.
						</p>
						<p>
							One command to install. Full API, Docker image, and a documented data format you can read without us.
						</p>
						<hr/>
						<p>
							<b>Best for:</b> the technically comfortable, the privacy-first, and anyone who wants their family's records to outlive any company.
						</p>
						<a className="btn btn-primary btn-soft m-2" href={`${authSettings.oidcRegisterUrl}?${new URLSearchParams({ returnUrl: RoutePaths.Archive.List })}`}>
							Read the self-hosting guide
						</a>

					</div>
				</div>
			</div>

			<h2 className="text-xl font-bold mt-6">
				Not sure? Switch whenever.
			</h2>
			<p className="mt-2">
				Start managed, migrate to self-hosted later — or the other way round. Your data exports in an open format either way. No lock-in, no hostage-taking, no "contact sales to leave".
			</p>
		</>
	)}
