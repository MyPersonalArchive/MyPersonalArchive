using System.Text.Json.Nodes;

namespace Backend.Mpa.Core.Store;

public sealed record BlobOcrModel(
	Guid BlobId,
	string SourceFileName,
	string MimeType,
	int PageCount,
	string Engine,
	string EngineVersion,
	int Oem,
	string Psm,
	double RotateRadians,
	IReadOnlyList<string> Language,
	string Text,
	IReadOnlyList<BlobOcrPage> Pages,
	DateTimeOffset CreatedAt,
	string CreatedBy,
	string SchemaVersion = "2.0");

public sealed record BlobOcrPage(
	int PageNumber,
	int Width,
	int Height,
	float? Confidence,
	JsonArray? Blocks);

public sealed record BlobOcrUpload(
	string FileName,
	string EngineVersion,
	int Oem,
	string Psm,
	double RotateRadians,
	IReadOnlyList<string> Language,
	string Text,
	IReadOnlyList<BlobOcrPage> Pages);
