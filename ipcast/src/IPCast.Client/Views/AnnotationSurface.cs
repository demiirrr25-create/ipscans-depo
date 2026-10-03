using System.Globalization;
using Avalonia;
using Avalonia.Controls;
using Avalonia.Input;
using Avalonia.Media;

namespace IPCast.Client.Views;

/// <summary>Temporary viewer annotations. Never injects input or changes remote files.</summary>
public sealed class AnnotationSurface : Control
{
    private sealed record Mark(string Tool, List<Point> Points, string Text);
    private readonly List<Mark> _marks = [];
    private Mark? _active;
    public string Tool { get; set; } = "Pen";
    public string Label { get; set; } = "Note";
    public AnnotationSurface() => Cursor = new Cursor(StandardCursorType.Cross);
    public void Clear() { _marks.Clear(); _active = null; InvalidateVisual(); }
    private Point Normalize(Point p) => new(Math.Clamp(p.X / Math.Max(1, Bounds.Width), 0, 1), Math.Clamp(p.Y / Math.Max(1, Bounds.Height), 0, 1));
    private Point Expand(Point p) => new(p.X * Bounds.Width, p.Y * Bounds.Height);
    protected override void OnPointerPressed(PointerPressedEventArgs e)
    {
        base.OnPointerPressed(e);
        if (!e.GetCurrentPoint(this).Properties.IsLeftButtonPressed) return;
        var point = Normalize(e.GetPosition(this));
        if (Tool == "Erase")
        {
            for (var i = _marks.Count - 1; i >= 0; i--)
            {
                var points = _marks[i].Points;
                if (point.X >= points.Min(p => p.X) - 0.02 && point.X <= points.Max(p => p.X) + 0.02 &&
                    point.Y >= points.Min(p => p.Y) - 0.02 && point.Y <= points.Max(p => p.Y) + 0.02)
                { _marks.RemoveAt(i); break; }
            }
        }
        else
        {
            if (_marks.Count >= 200) _marks.RemoveAt(0);
            _active = new Mark(Tool, [point, point], Label[..Math.Min(Label.Length, 200)]);
            _marks.Add(_active);
            e.Pointer.Capture(this);
        }
        e.Handled = true; InvalidateVisual();
    }
    protected override void OnPointerMoved(PointerEventArgs e)
    {
        base.OnPointerMoved(e);
        if (_active is null) return;
        var point = Normalize(e.GetPosition(this));
        if (_active.Tool == "Pen" && _active.Points.Count < 8192) _active.Points.Add(point);
        else _active.Points[^1] = point;
        e.Handled = true; InvalidateVisual();
    }
    protected override void OnPointerReleased(PointerReleasedEventArgs e)
    {
        base.OnPointerReleased(e);
        _active = null; e.Pointer.Capture(null); e.Handled = true;
    }
    public override void Render(DrawingContext context)
    {
        base.Render(context);
        context.FillRectangle(Brushes.Transparent, Bounds.WithX(0).WithY(0));
        var pen = new Pen(Brushes.White, 2);
        foreach (var mark in _marks)
        {
            var a = Expand(mark.Points[0]); var b = Expand(mark.Points[^1]);
            var rect = new Rect(Math.Min(a.X, b.X), Math.Min(a.Y, b.Y), Math.Abs(a.X - b.X), Math.Abs(a.Y - b.Y));
            switch (mark.Tool)
            {
                case "Rectangle": context.DrawRectangle(null, pen, rect); break;
                case "Circle": context.DrawEllipse(null, pen, rect); break;
                case "Text":
                    context.DrawText(new FormattedText(mark.Text, CultureInfo.CurrentCulture, FlowDirection.LeftToRight, Typeface.Default, 18, Brushes.White), a);
                    break;
                case "Arrow":
                    context.DrawLine(pen, a, b);
                    var angle = Math.Atan2(b.Y - a.Y, b.X - a.X);
                    context.DrawLine(pen, b, new Point(b.X - 14 * Math.Cos(angle - 0.5), b.Y - 14 * Math.Sin(angle - 0.5)));
                    context.DrawLine(pen, b, new Point(b.X - 14 * Math.Cos(angle + 0.5), b.Y - 14 * Math.Sin(angle + 0.5)));
                    break;
                default:
                    for (var i = 1; i < mark.Points.Count; i++) context.DrawLine(pen, Expand(mark.Points[i - 1]), Expand(mark.Points[i]));
                    break;
            }
        }
    }
}
