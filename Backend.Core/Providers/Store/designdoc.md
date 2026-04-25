
# Suggested new intefaces for storing files and objects/media

The containerNames can be used to create a folder structure for easier management of files, and the objectId can be used as the file name. This way we can easily switch to a cloud storage provider in the future if needed, without changing the interface.

Use objectId when the file name is not important, because there can be very many  objects. They will be mapped to filesname in the database?
- Since a container can/will contain many objects, the IStorage implementation can handle the folder structure in a way that prevents too many files in a single folder (e.g. by using the first few characters of the objectId as subfolders). 
Use filename when the filename is fixed. "storeFilters.json", "externalAccount.json", "profilepicture.png" etc.

## Examples:
containerNames: `["tenant", "-1", "blobs"], objectId: "1234-5678-90ab-cdef"`
	This would result in a file path like: `tenant/-1/blobs/123/123456/1234567890abcdef`

containerNames: `["tenant", "-1", "user", "admin@localhost"]`, filename: `"storedFilters.json"`
	This would result in a file path like: `tenant/-1/user/admin@localhost/storedFilters.json`


## Requirements constraints
- IFileStore will be used for files at system-level, tenant-level and user-level 
(EmailProviderSettings.json at system-level vs. StoredFilterSettings.json at tenant-level vs. ExternalAccountSettings.json at user-level)

- IObjectStore will only be used at tenant-level. Objects are always pr. tenant

## Performance considerations?
Most relevant filesystems do well below 10,000-30,000 files in a folder, so consider implementing some folder structure based on the objectId (split on every 3 hex digits keeps us below the bad performance threshold)
