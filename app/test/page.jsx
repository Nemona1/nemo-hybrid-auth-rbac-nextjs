export default function TestPage() {
  console.log('Test page loaded!');
  
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center">
        <h1 className="text-4xl font-bold text-foreground mb-4">Test Page</h1>
        <p className="text-muted">If you can see this, React is working!</p>
        <button 
          onClick={() => alert('Button clicked!')}
          className="btn-primary mt-4"
        >
          Test Button
        </button>
      </div>
    </div>
  );
}