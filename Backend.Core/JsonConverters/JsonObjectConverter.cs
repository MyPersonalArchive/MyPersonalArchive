using System.Text.Json.Nodes;
using Newtonsoft.Json;
using Newtonsoft.Json.Linq;

public class JsonObjectConverter : JsonConverter<JsonObject>
{
    public override void WriteJson(JsonWriter writer, JsonObject value, JsonSerializer serializer)
    {
        if (value == null)
        {
            writer.WriteNull();
            return;
        }

        // Use the raw JSON representation
        var rawJson = value.ToJsonString();
        var jToken = JToken.Parse(rawJson);
        jToken.WriteTo(writer);
    }

    public override JsonObject ReadJson(JsonReader reader, Type objectType, JsonObject existingValue, bool hasExistingValue, JsonSerializer serializer)
    {
        if (reader.TokenType == JsonToken.Null)
            return null;

        var jToken = JToken.Load(reader);

        // Parse into a System.Text.Json.JsonObject
        return JsonNode.Parse(jToken.ToString()) as JsonObject;
    }
}