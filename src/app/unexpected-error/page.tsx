export default function UnexpectedErrorPage() {
  return (
    <div className="mx-auto max-w-md px-4 py-20 text-center">
      <h1 className="text-lg font-semibold text-gray-900">予期しないエラーが発生しました</h1>
      <p className="mt-2 text-sm text-gray-500">
        しばらく時間をおいてから、もう一度お試しください。
      </p>
    </div>
  );
}