import { Link, useNavigate, useParams } from "react-router-dom"
import { TagsInput } from "../Components/TagsInput"
import { useEffect, useState } from "react"
import { useAtomValue } from "jotai"
import { storedFiltersAtom, tagsAtom } from "../Utils/Atoms"
import { allMetadataTypes } from "../Components/MetadataTypes"
import { useApiClient } from "../Utils/useApiClient"
import { RoutePaths } from "../RoutePaths"

export const StoredFilterEditPage = () => {

	const [name, setName] = useState<string>("")
	const [title, setTitle] = useState<string>("")
	const [tags, setTags] = useState<string[]>([])
	const [selectedMetadataTypes, setSelectedMetadataTypes] = useState<Set<string>>(new Set<string>())

	const allStoredFilters = useAtomValue(storedFiltersAtom)
	const allTags = useAtomValue(tagsAtom)

	const params = useParams()
	const navigate = useNavigate()
	const apiClient = useApiClient()

	useEffect(() => {
		if (!params.id) {
			navigate(RoutePaths.StoredFilters)
			return
		}
		const filter = allStoredFilters.find(f => f.id.toString() === params.id)
		if (!filter) {
			navigate(RoutePaths.StoredFilters)
			return
		}

		setName(filter.name)
		setTitle(filter.filterDefinition.title || "")
		setTags(filter.filterDefinition.tags)
		setSelectedMetadataTypes(new Set<string>(filter.filterDefinition.metadataTypes))
	}, [params.id, allStoredFilters])


	const save = (event: React.FormEvent<HTMLFormElement>) => {
		event.preventDefault()

		apiClient.put("/api/execute/UpdateStoredFilter", {
			id: parseInt(params.id || "0"),
			name,
			filterDefinition: {
				title,
				tags,
				metadataTypes: Array.from(selectedMetadataTypes),
			}
		})

		navigate(RoutePaths.StoredFilters)
	}

	return (
		<>
			<form onSubmit={save}>
				<h1 className="heading-1">
					Edit filter
				</h1>

				<div className="aligned-labels-and-inputs">
					<label htmlFor="name">Filter name</label>
					<input type="text"
						className="input"
						id="name" placeholder="" autoFocus required data-1p-ignore
						value={name}
						onChange={event => setName(event.target.value)}
					/>
				</div>

				<b>Filter definition</b>
				<div className="aligned-labels-and-inputs">
					<label htmlFor="title">Title</label>
					<input type="text"
						className="input"
						id="title" placeholder="" autoFocus required data-1p-ignore
						value={title}
						onChange={event => setTitle(event.target.value)}
					/>
				</div>


				<div className="aligned-labels-and-inputs">
					<label htmlFor="tags">Tags</label>
					<TagsInput tags={tags} setTags={setTags} htmlId="tags" autocompleteList={allTags} />
				</div>

				<div className="aligned-labels-and-inputs">
					<label htmlFor="metadataTypes">Metadata types</label>
					<div className="flex flex-row gap-2">
						{
							allMetadataTypes.filter(({ path }) => typeof path === "string")
								.map(({ displayName, path }) => (
									<label key={displayName} >
										<input
											type="checkbox"
											id={displayName}
											checked={selectedMetadataTypes.has(path as string)}
											onChange={() => {
												if (selectedMetadataTypes.has(path as string))
													selectedMetadataTypes.delete(path as string)
												else
													selectedMetadataTypes.add(path as string)

												setSelectedMetadataTypes(new Set(selectedMetadataTypes))
											}}
										/>
										{displayName}
									</label>
								))
						}
					</div>
				</div>

				<div className="stack-horizontal to-the-right my-4">
					<Link className="link align-with-btn" to={-1 as any}>
						Back
					</Link>
					<button className="btn btn-primary" type="submit">
						Save
					</button>
				</div>
			</form >
		</>
	)
}
