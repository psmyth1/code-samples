using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace FTWRev.data.libs
{
    public class FakeCooldown
    {
        public int SpellID;
        public double Cooldown;
        public string Name;
        public FakeCooldown(string line)
        {
            line = line.Replace("\t", " ");
            line = line.Replace("  ", " ");
            string[] words = line.Split(' ');
            this.SpellID = Int32.Parse(words[0]);
            this.Cooldown = Double.Parse(words[1]);
            StringBuilder sb = new StringBuilder();
            for (int j = 2; j < words.Length; j++)
            {
                sb.Append(words[j]);
                if (j < words.Length - 1)
                    sb.Append(" ");
            }
            this.Name = sb.ToString();
        }
    }
}
