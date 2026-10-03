Add-Type -AssemblyName System.Drawing
$portfolioRoot = Split-Path $PSScriptRoot -Parent
$fonts = New-Object System.Drawing.Text.PrivateFontCollection
$fonts.AddFontFile((Join-Path $portfolioRoot 'assets/fonts/font-7.ttf'))
$font = New-Object System.Drawing.Font($fonts.Families[0], 1000, [System.Drawing.FontStyle]::Bold, [System.Drawing.GraphicsUnit]::Pixel)
$bitmap = New-Object System.Drawing.Bitmap(1, 1)
$graphics = [System.Drawing.Graphics]::FromImage($bitmap)
$format = [System.Drawing.StringFormat]::GenericTypographic.Clone()
$format.FormatFlags = $format.FormatFlags -bor [System.Drawing.StringFormatFlags]::MeasureTrailingSpaces
$culture = [System.Globalization.CultureInfo]::InvariantCulture
function Number($value) { return $value.ToString('0.###', $culture) }
$variants = @{}
foreach ($word in @(('DA L' + [char]0xD3 + 'GICA'), 'AO PRODUTO', 'EM USO.', 'FROM LOGIC', 'TO PRODUCT', 'IN USE.')) {
    $cursor = 0.0
    $paths = @()
    $fullBounds = $null
    foreach ($letter in $word.ToCharArray()) {
        $outline = New-Object System.Drawing.Drawing2D.GraphicsPath
        $outline.AddString([string]$letter, $fonts.Families[0], [int][System.Drawing.FontStyle]::Bold, 1000, [System.Drawing.PointF]::new($cursor, 0), $format)
        if ($outline.PointCount -gt 0) {
            $points = $outline.PathPoints
            $types = $outline.PathTypes
            $parts = @()
            for ($i = 0; $i -lt $points.Length; $i++) {
                $kind = $types[$i] -band 7
                if ($kind -eq 0) { $parts += 'M' + (Number $points[$i].X) + ' ' + (Number $points[$i].Y) }
                elseif ($kind -eq 1) { $parts += 'L' + (Number $points[$i].X) + ' ' + (Number $points[$i].Y) }
                elseif ($kind -eq 3) {
                    $parts += 'C' + (Number $points[$i].X) + ' ' + (Number $points[$i].Y) + ' ' + (Number $points[$i+1].X) + ' ' + (Number $points[$i+1].Y) + ' ' + (Number $points[$i+2].X) + ' ' + (Number $points[$i+2].Y)
                    $i += 2
                }
                if (($types[$i] -band 128) -ne 0) { $parts += 'Z' }
            }
            $bounds = $outline.GetBounds()
            if ($null -eq $fullBounds) { $fullBounds = $bounds } else { $fullBounds = [System.Drawing.RectangleF]::Union($fullBounds, $bounds) }
            $paths += ($parts -join '')
        }
        $cursor += $graphics.MeasureString([string]$letter, $font, [System.Drawing.PointF]::new(0,0), $format).Width - 40
        if ($letter -eq ' ') { $cursor += 40 }
        $outline.Dispose()
    }
    $variants[$word] = @{ paths=$paths; viewBox=((Number ($fullBounds.X - 8)) + ' ' + (Number ($fullBounds.Y - 8)) + ' ' + (Number ($fullBounds.Width + 16)) + ' ' + (Number ($fullBounds.Height + 16))); width=$fullBounds.Width + 16; height=$fullBounds.Height + 16 }
}
$json = $variants | ConvertTo-Json -Depth 4 -Compress
[System.IO.File]::WriteAllText((Join-Path $portfolioRoot 'assets/js/hero-lettering.js'), "window.heroLettering = $json;", [System.Text.UTF8Encoding]::new($false))
$graphics.Dispose(); $bitmap.Dispose(); $font.Dispose(); $fonts.Dispose(); $format.Dispose()
