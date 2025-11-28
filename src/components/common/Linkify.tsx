import React from 'react';

interface LinkifyProps {
    children: string;
}

export const Linkify: React.FC<LinkifyProps> = ({ children }) => {
    if (!children) return null;

    // URLを検出する正規表現
    const urlRegex = /(https?:\/\/[^\s]+)/g;

    const parts = children.split(urlRegex);

    return (
        <>
            {parts.map((part, index) => {
                if (part.match(urlRegex)) {
                    return (
                        <a
                            key={index}
                            href={part}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-400 hover:text-blue-300 hover:underline break-all"
                            onClick={(e) => e.stopPropagation()} // 親要素のクリックイベント（ページ遷移など）を止める
                        >
                            {part}
                        </a>
                    );
                }
                return part;
            })}
        </>
    );
};
