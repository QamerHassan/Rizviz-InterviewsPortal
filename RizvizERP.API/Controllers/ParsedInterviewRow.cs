using System.Collections.Generic;
using System.Linq;

namespace RizvizERP.API.Controllers
{
    public class ParsedInterviewRow
    {
        public List<string> Headers { get; set; } = new List<string>();
        public Dictionary<string, string> ByHeader { get; set; } = new Dictionary<string, string>();

        public string[] ToColumnArray()
        {
            if (Headers == null || Headers.Count == 0)
                return ByHeader.Values.ToArray();

            return Headers.Select(h => ByHeader.TryGetValue(h, out var v) ? v : null).ToArray();
        }
    }
}
