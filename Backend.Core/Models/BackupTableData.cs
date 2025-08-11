public class BackupTableData
{
    public string Name { get; set; }
    public int TenantId { get; set; }
    public BackupPayload.EncryptionInfo Encryption { get; set; }
}