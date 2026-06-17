#!/usr/bin/env dotnet-script
#r "nuget: ClosedXML, 0.102.2"
using ClosedXML.Excel;

var path = @"F:\Users\Qamer Hassan\RizvizERP\RizvizERP.API\users.xlsx";
var bytes = File.ReadAllBytes(path);
using var ms = new MemoryStream(bytes);
using var wb = new XLWorkbook(ms);
var ws = wb.Worksheet("users");
foreach (var row in ws.RowsUsed().Skip(1))
{
    var id = row.Cell(3).GetString()?.Trim();
    if (string.Equals(id, "QamerHassan", StringComparison.OrdinalIgnoreCase))
    {
        Console.WriteLine($"Row {row.RowNumber()}: username='{id}' | col4(pwd)='{row.Cell(4).GetString()?.Trim()}' | col8(isFirst)='{row.Cell(8).GetString()}' | isEmpty={row.Cell(8).IsEmpty()} | type={row.Cell(8).Value.Type}");
    }
}
