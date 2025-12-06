import { FormEvent, useEffect, useState } from "react"
import { Link, useNavigate, useSearchParams } from "react-router-dom"
import { useApiClient } from "../Utils/useApiClient"
import { SignalRMessage, useSignalR } from "../Utils/useSignalR"
import { TagsInput } from "../Components/TagsInput"
import { useAtomValue } from "jotai"
import { tagsAtom } from "../Utils/Atoms"
import { createQueryString } from "../Utils/createQueryString"
import { FileDropZone } from "../Components/FileDropZone"
import { RoutePaths } from "../RoutePaths"
import { StoredFilterSelector } from "../Components/StoredFilterSelector"
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome"
import { faPaperclip } from "@fortawesome/free-solid-svg-icons"

type ListResponse = {
	id: number
	title: string
	tags: string[]
	blob: Blob[]
	createdAt: string
	documentDate: Date
}

type ArchiveItem = {
	id: number
	title: string
	blobs: Blob[]
	tags: string[]
	createdAt: Date
	documentDate: Date
}

type Blob = {
	id: number
	// numberOfPages: number
	// mimeType?: string
}

export const ArchiveItemListPage = () => {
	const [archiveItems, setArchiveItems] = useState<ArchiveItem[]>()
	const [searchParams] = useSearchParams()

	const navigate = useNavigate()
	const apiClient = useApiClient()

	useEffect(() => {
		const payload = {
			title: searchParams.get("title") || undefined,
			tags: searchParams.getAll("tags"),
			filter: searchParams.get("filter") || undefined,
			metadataTypes: searchParams.getAll("metadataTypes")
		}
		apiClient.get<ListResponse[]>("/api/archive/list", payload)
			.then(response => setArchiveItems(response.map(item => ({ ...item, createdAt: new Date(item.createdAt), documentDate: item.documentDate }))))
	}, [searchParams])

	useSignalR((message: SignalRMessage) => {
		switch (message.data) {
			case "ArchiveItemCreated":
			case "ArchiveItemUpdated":
			case "ArchiveItemDeleted": {
				apiClient.get<ListResponse[]>("/api/archive/list")
					.then(response => {
						setArchiveItems(response.map(item => ({ ...item, createdAt: new Date(item.createdAt), documentDate: item.documentDate })))
					})
				break
			}
		}
	})

	const newArchiveItem = () => {
		navigate("/archive/new")
	}

	return (
		<div className="container mx-auto px-4 py-6">
			<h1 className="heading-1">
				Archive
			</h1>

			<FileDropZone onBlobAttached={() => { /* //TODO: Suggest to create an archive item from the attached blob? */ }} />

			<div className="stack-horizontal to-the-right my-4">
				<Link className="link align-with-btn" to={RoutePaths.Blobs}>Show blobs</Link>
				<button className="btn" onClick={newArchiveItem}>Create new item</button>
			</div>

			<Filter />

			<StoredFilterSelector />

			<div className="overflow-x-auto my-4">
				<table className="w-full table with-column-seperators">
					<thead>
						<tr>
							<th>Title</th>
							<th>Document date</th>
							<th>Created</th>
						</tr>
					</thead>
					<tbody>
						{
							archiveItems?.map(item => <Row key={item.id} archiveItem={item} />)
						}
						{
							archiveItems && archiveItems.length === 0 && (
								<tr>
									<td colSpan={4} className="text-center italic text-gray-500 py-4">
										No items found
									</td>
								</tr>
							)
						}
					</tbody>
				</table>
			</div>
			<div className="stack-horizontal to-the-right my-4">
				<button className="btn" onClick={newArchiveItem}>Create new item</button>
			</div>
		</div>
	)
}


type RowProps = {
	archiveItem: ArchiveItem
}
const Row = ({ archiveItem }: RowProps) => {
	return (
		<tr>
			<td>
				<Link to={`/archive/edit/${archiveItem.id}`} className="text-blue-600 hover:underline">{archiveItem.title}</Link>
				{archiveItem.blobs.length > 0 && <FontAwesomeIcon icon={faPaperclip} className="ml-1" />}
				<br />
				{
					archiveItem.tags.map((tag, ix) => (
						<span key={ix} className="inline-block bg-gray-200 text-gray-700 rounded-full px-2 py-1 mr-1 text-xs">{tag}</span>
					))
				}
			</td>
			<td>
				{archiveItem.documentDate ? new Date(archiveItem.documentDate).toLocaleDateString() : ""}
			</td>
			<td>
				{archiveItem.createdAt.toLocaleDateString()}
			</td>
		</tr>
	)
}


const Filter = () => {
	const [title, setTitle] = useState<string>("")
	const [tags, setTags] = useState<string[]>([])
	const allTags = useAtomValue(tagsAtom)
	const [searchParams] = useSearchParams()
	const navigate = useNavigate()

	useEffect(() => {
		setTitle(searchParams.get("title") ?? "")
		setTags(searchParams.getAll("tags"))
	}, [])

	const search = (event: FormEvent<HTMLFormElement>) => {
		event.preventDefault()
		navigate({
			search: createQueryString({ title, tags: tags.map(tag => tag.trim()) }, { skipEmptyStrings: true })
		})
	}

	const reset = (event: FormEvent<HTMLFormElement>) => {
		event.preventDefault()
		setTitle("")
		setTags([])
		navigate({
			search: createQueryString({ title: "", tags: [] }, { skipEmptyStrings: false })
		})
	}

	return (
		<form onSubmit={search} onReset={reset} className="stack-horizontal to-the-left my-4">
			<input className="input"
				type="text"
				placeholder="Search by title"
				value={title}
				onChange={event => setTitle(event.target.value)}
			/>
			<TagsInput placeholder="Search by tags" tags={tags} setTags={setTags} autocompleteList={allTags} />
			<button type="submit" className="btn btn-primary" >
				Search
			</button>
			<button type="reset" className="btn">
				Reset
			</button>
		</form>
	)
}