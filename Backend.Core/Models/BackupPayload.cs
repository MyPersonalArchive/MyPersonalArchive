public class BackupPayload
{
    public bool Replace { get; set; }

    public FileInfo File { get; set; }
    public EncryptionInfo Encryption { get; set; }

    public class FileInfo
    {
        public int TenantId { get; set; }
        public Guid FileId { get; set; }
        public int BlobId { get; set; }
        public int ArchiveItemId { get; set; }
        public DateTimeOffset UploadedAt { get; set; }
        public string MimeType { get; set; }
        public string UploadedBy { get; set; }
        public string FileName { get; set; }
    }

    public class EncryptionInfo
    {
        public string CipherText { get; set; }
        public string EncryptedKey { get; set; }
        public string IV { get; set; }
        public string Tag { get; set; }
    }
}