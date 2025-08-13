import React from 'react';

export function Table({ className = '', children, empty, ...props }) {
  const hasBody = React.Children.toArray(children).some(
    (child) => child?.type === 'tbody'
  );
  return (
    <table className={`table ${className}`} {...props}>
      {hasBody ? children : (
        <tbody>
          <tr>
            <td colSpan="100%" className="py-4 text-center text-gray-500">
              {empty}
            </td>
          </tr>
        </tbody>
      )}
    </table>
  );
}

export const Thead = (props) => <thead {...props} />;
export const Tbody = (props) => <tbody {...props} />;
export const Tr = (props) => <tr {...props} />;
export const Th = ({ className = '', scope = 'col', ...props }) => <th scope={scope} className={className} {...props} />;
export const Td = ({ className = '', ...props }) => <td className={className} {...props} />;

export default { Table, Thead, Tbody, Tr, Th, Td };
